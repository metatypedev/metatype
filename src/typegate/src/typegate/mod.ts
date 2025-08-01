// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type Register, ReplicatedRegister } from "./register.ts";
import * as Sentry from "sentry";
import { type RateLimiter, RedisRateLimiter } from "./rate_limiter.ts";
import { handlePlaygroundGraphQL } from "../services/playground_service.ts";
import { ensureJWT, handleAuth } from "../services/auth/mod.ts";
import { handleInfo } from "../services/info_service.ts";
import {
  jsonError,
  methodNotAllowed,
  notFound,
  serverError,
} from "../services/responses.ts";
import { handleRest } from "../services/rest_service.ts";
import { QueryEngine } from "../engine/query_engine.ts";
import { type PushHandler, PushResponse } from "../typegate/hooks.ts";
import { upgradeTypegraph } from "../typegraph/versions.ts";
import { parseGraphQLTypeGraph } from "../transports/graphql/typegraph.ts";
import * as PrismaHooks from "../runtimes/prisma/hooks/mod.ts";
import * as DenoHooks from "../runtimes/deno/hooks/mod.ts";
import * as PythonHooks from "../runtimes/python/hooks/mod.ts";
import {
  prepareRuntimeReferences,
  type RuntimeResolver,
  SecretManager,
  TypeGraph,
  type TypeGraphDS,
} from "../typegraph/mod.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { TypeGraphRuntime } from "../runtimes/typegraph.ts";
import { resolveIdentifier } from "../services/middlewares.ts";
import { handleGraphQL } from "../services/graphql_service.ts";
import { getLogger } from "../log.ts";
import { MigrationFailure } from "../runtimes/prisma/hooks/run_migrations.ts";
import { DenoFailure } from "../runtimes/deno/hooks/mod.ts";
import { ValidationFailure } from "../runtimes/python/hooks/mod.ts";
import introspectionJson from "../typegraphs/introspection.json" with {
  type: "json",
};
import { ArtifactService } from "../services/artifact_service.ts";
import type { ArtifactStore } from "./artifacts/mod.ts";
// TODO move from tests (MET-497)
import { MemoryRegister } from "./memory_register.ts";
import { NoLimiter } from "./no_limiter.ts";
import { typegraphIdSchema, TypegraphStore } from "../sync/typegraph.ts";
import { createLocalArtifactStore } from "./artifacts/local.ts";
import { createSharedArtifactStore } from "./artifacts/shared.ts";
import { AsyncDisposableStack } from "dispose";
import {
  globalConfig,
  resolveRedisURL,
  type TypegateConfig,
} from "../config.ts";
import { TypegateCryptoKeys } from "../crypto.ts";
import type { DenoRuntime } from "../runtimes/deno/deno.ts";
import { connect, type Redis } from "redis";

const INTROSPECTION_JSON_STR = JSON.stringify(introspectionJson);

const logger = getLogger("typegate");

const ignoreList = new Set(["favicon.ico"]);

function parsePath(pathname: string): [string, string | undefined] {
  const [engineName, serviceName] = pathname.split("/").slice(1, 3);
  if (engineName === "typegate") {
    // if path starts with typegate, there is no service
    // and typegraph correspond to full path
    return [pathname.slice(1), undefined];
  }
  return [engineName, serviceName];
}

export type PushResult = {
  name: string;
  engine: QueryEngine | null;
  response: PushResponse;
};

export interface DeinitOptions {
  engines?: boolean;
}

export class Typegate implements AsyncDisposable {
  #onPushHooks: PushHandler[] = [];
  #artifactService: ArtifactService;
  #disposed = false;

  static async init(
    config: TypegateConfig,
    customRegister: Register | null = null,
  ): Promise<Typegate> {
    const { sync: syncConfig } = config;
    const tmpDir = config.base.tmp_dir;
    const cryptoKeys = await TypegateCryptoKeys.init(config.base.tg_secret);
    if (syncConfig == null) {
      logger.warn("Entering no-sync mode...");
      logger.warn(
        "Enable sync if you want to use accross multiple instances or if you want persistence.",
      );

      await using stack = new AsyncDisposableStack();

      const register = customRegister ?? new MemoryRegister();
      const artifactStore = await createLocalArtifactStore(tmpDir, cryptoKeys);
      const redisConfig = config.base.redis_url &&
        resolveRedisURL(config.base.redis_url);
      const redis = redisConfig && (await connect(redisConfig));

      if (redis) {
        stack.defer(async () => {
          await redis.quit();
        });
      }

      stack.use(register);
      stack.use(artifactStore);

      return new Typegate(
        register,
        new NoLimiter(),
        artifactStore,
        config,
        cryptoKeys,
        stack.move(),
        redis,
      );
    } else {
      logger.info("Entering sync mode...");
      if (customRegister) {
        throw new Error("Custom register is not supported in sync mode");
      }

      await using stack = new AsyncDisposableStack();

      const redis = await connect(syncConfig.redis);
      const limiter = await RedisRateLimiter.init(syncConfig.redis);
      // stack.use(limiter);
      stack.defer(async () => {
        await limiter.terminate();
        await redis.quit();
      });

      const artifactStore = await createSharedArtifactStore(
        tmpDir,
        syncConfig,
        cryptoKeys,
      );
      stack.use(artifactStore);

      const typegate = new Typegate(
        null!,
        limiter,
        artifactStore,
        config,
        cryptoKeys,
        stack.move(),
        redis,
      );

      const typegraphStore = TypegraphStore.init(syncConfig, cryptoKeys);
      const register = await ReplicatedRegister.init(
        typegate,
        syncConfig.redis,
        typegraphStore,
      );
      typegate.disposables.use(register);

      (typegate as { register: Register }).register = register;

      if (config.sync?.forceRemove) {
        logger.warn("Force removal at boot enabled");
        const history = await register.replicatedMap.getAllHistory();
        for (const { name, payload } of history) {
          try {
            await typegate.forceRemove(name, payload, typegraphStore);
          } catch (e) {
            logger.error(`Failed to force remove typegraph "${name}": ${e}`);
            Sentry.captureException(e);
          }
        }
      }

      const lastSync = await register.historySync().catch((err) => {
        logger.error(err);
        throw new Error(
          `failed to load history at boot, aborting: ${err.message}`,
        );
      });
      register.startSync(lastSync);

      const lastSyncResponses = await register.historySyncResponses().catch(
        (err) => {
          logger.error(err);
          throw new Error(
            `failed to load response history at boot, aborting: ${err.message}`,
          );
        },
      );
      register.startSyncResponses(lastSyncResponses);

      return typegate;
    }
  }

  private constructor(
    public readonly register: Register,
    private limiter: RateLimiter,
    public artifactStore: ArtifactStore,
    public readonly config: TypegateConfig, // TODO deep readonly??
    public cryptoKeys: TypegateCryptoKeys,
    private disposables: AsyncDisposableStack,
    public redis?: Redis,
  ) {
    this.#onPush((tg) => Promise.resolve(upgradeTypegraph(tg)));
    this.#onPush((tg) => Promise.resolve(parseGraphQLTypeGraph(tg)));
    this.#onPush(PrismaHooks.generateSchema);
    this.#onPush(PrismaHooks.runMigrations);
    this.#onPush(DenoHooks.cacheModules);
    this.#onPush(PythonHooks.codeValidations);
    this.#artifactService = new ArtifactService(artifactStore);
  }

  async [Symbol.asyncDispose]() {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.disposables[Symbol.asyncDispose]();
  }

  #onPush(handler: PushHandler) {
    this.#onPushHooks.push(handler);
  }

  async #handleOnPushHooks(
    typegraph: TypeGraphDS,
    secretManager: SecretManager,
    response: PushResponse,
  ): Promise<TypeGraphDS> {
    let res = typegraph;

    for (const handler of this.#onPushHooks) {
      try {
        res = await handler(
          res,
          secretManager,
          response,
          this.artifactStore,
          this,
        );
      } catch (err: any) {
        logger.error(`Error in onPush hook: ${err}`);
        // FIXME: MigrationFailur err message parser doesn't support all errors like
        // can't reach database errs
        if (err instanceof MigrationFailure && err.errors[0]) {
          response.setFailure(err.errors[0]);
        } else if (err instanceof DenoFailure) {
          response.setFailure(err.failure);
        } else if (err instanceof ValidationFailure) {
          response.setFailure(err.failure);
        } else {
          response.setFailure({
            reason: "Unknown",
            message: err.toString(),
          });
        }
      }
    }

    return res;
  }

  async handle(request: Request, connInfo: Deno.NetAddr): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return handleInfo(request);
      }

      const [engineName, serviceName] = parsePath(url.pathname);

      if (serviceName === "artifacts") {
        return await this.#artifactService.handle(request, engineName);
      }

      if (!engineName || ignoreList.has(engineName)) {
        logger.error("engine not found on request url {}", {
          engineName,
          ignored: ignoreList.has(engineName),
          url: request.url,
        });
        return notFound("engine name required on url");
      }

      const engine = this.register.get(engineName);
      if (!engine) {
        logger.error("engine not found for request {}", {
          engineName,
          url: request.url,
          engines: this.register.list().map((en) => en.name),
        });
        return notFound(`engine not found for typegraph '${engineName}'`);
      }

      const cors = engine.tg.cors(request);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: cors,
        });
      }

      if (serviceName === "auth") {
        return handleAuth(request, engine, new Headers(cors));
      }

      const jwtCheck = await ensureJWT(
        request,
        engine,
        new Headers(cors),
      ).catch((e) => e);
      if (jwtCheck instanceof Error) {
        return jsonError({ message: jwtCheck.message, status: 401 });
      }

      const [context, headers] = jwtCheck;

      const identifier = resolveIdentifier(request, engine, context, connInfo);
      const limit = await this.limiter.getLimitForEngine(engine, identifier);
      const info = {
        url,
        headers: Object.fromEntries(request.headers.entries()),
      };

      if (serviceName === "rest") {
        return handleRest(request, engine, context, info, limit, headers);
      }

      if (serviceName !== undefined) {
        return notFound();
      }
      // default to graphql service

      if (request.method === "GET" && globalConfig.debug) {
        return handlePlaygroundGraphQL(request, engine);
      }

      if (!engine.tg.tg.meta.queries.dynamic) {
        return notFound();
      }

      if (request.method !== "POST") {
        return methodNotAllowed();
      }

      return handleGraphQL(
        this.register,
        request,
        engine,
        context,
        info,
        limit,
        headers,
      );
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return serverError();
    }
  }

  async pushTypegraph(
    tgJson: TypeGraphDS,
    secrets: Record<string, string>,
    enableIntrospection: boolean,
    system = false,
  ): Promise<PushResult> {
    const name = TypeGraph.formatName(tgJson);

    if (SystemTypegraph.check(name)) {
      if (!system) {
        throw new Error(
          `Typegraph name ${name} cannot be used for non-system typegraphs`,
        );
      }
    } else {
      if (system) {
        throw new Error(
          `Typegraph name ${name} cannot be used for system typegraphs`,
        );
      }
    }

    const secretManager = new SecretManager(tgJson, secrets);

    const pushResponse = new PushResponse();
    logger.debug("handling onPush hooks");
    const tg = await this.#handleOnPushHooks(
      tgJson,
      secretManager,
      pushResponse,
    );

    if (pushResponse.failure) {
      return {
        name,
        engine: null,
        response: pushResponse,
      };
    }

    logger.info(`initializing engine`, { name });
    const engine = await this.initQueryEngine(
      tg,
      secretManager,
      SystemTypegraph.getCustomRuntimes(this),
      enableIntrospection,
    );

    const oldArtifacts = new Set(
      Object.values(this.register.get(name)?.tg.tg.meta.artifacts ?? {}).map(
        (m) => m.hash,
      ),
    );

    logger.info(`registering engine "${name}"`);
    await this.register.add(engine);

    const newArtifacts = new Set(
      Object.values(engine.tg.tg.meta.artifacts).map((m) => m.hash),
    );

    await this.artifactStore.updateRefCounts(newArtifacts, oldArtifacts);

    return {
      name,
      engine,
      response: pushResponse,
    };
  }

  async removeTypegraph(name: string) {
    const engine = this.register.get(name);
    if (!engine) {
      throw new Error(`Engine '${name}' not found`);
    }

    await this.register.remove(name);

    const artifacts = new Set(
      Object.values(engine.tg.tg.meta.artifacts).map((m) => m.hash),
    );
    await this.artifactStore.updateRefCounts(new Set(), artifacts);
    await this.artifactStore.runArtifactGC();
  }

  async forceRemove(
    name: string,
    payload: string,
    typegraphStore: TypegraphStore,
  ) {
    logger.warn(`Dropping "${name}": started`);
    const typegraphId = typegraphIdSchema.parse(JSON.parse(payload));
    const [tg] = await typegraphStore.downloadTypegraph(typegraphId);
    const artifacts = new Set(
      Object.values(tg.meta.artifacts).map((m) => m.hash),
    );

    await this.register.remove(name);
    await this.artifactStore.updateRefCounts(new Set(), artifacts);
    await this.artifactStore.runArtifactGC();
    logger.warn(`Dropping "${name}": done`);
  }

  async initQueryEngine(
    tgDS: TypeGraphDS,
    secretManager: SecretManager,
    customRuntime: RuntimeResolver = {},
    enableIntrospection: boolean,
  ): Promise<QueryEngine> {
    const introspectionDef = parseGraphQLTypeGraph(
      await TypeGraph.parseJson(INTROSPECTION_JSON_STR),
    );
    const rtRefResolver = prepareRuntimeReferences(this, secretManager);

    let introspection: TypeGraph | null = null;
    if (enableIntrospection) {
      const typegraphRuntime = TypeGraphRuntime.init(tgDS, [], {});
      const introspectionRuntimeRefData = await rtRefResolver(
        introspectionDef,
        {
          typegraph: typegraphRuntime,
        },
      );
      (typegraphRuntime as TypeGraphRuntime).initTypeGenerator(
        this.config.base,
        introspectionRuntimeRefData.denoRuntime as DenoRuntime,
      );

      introspection = await TypeGraph.init(
        this,
        introspectionDef,
        new SecretManager(introspectionDef, {}),
        introspectionRuntimeRefData,
        null,
      );
    }

    const tgRuntimeRefData = await rtRefResolver(tgDS, customRuntime);
    const tg = await TypeGraph.init(
      this,
      tgDS,
      secretManager,
      tgRuntimeRefData,
      introspection,
    );

    const engine = new QueryEngine(tg);
    await engine.registerEndpoints();
    return engine;
  }
}
