// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import config from "../config.ts";
import { Register } from "./register.ts";
import * as Sentry from "sentry";
import { RateLimiter } from "./rate_limiter.ts";
import { ConnInfo } from "std/http/server.ts";
import { handlePlaygroundGraphQL } from "../services/playground_service.ts";
import { ensureJWT, handleAuth } from "../services/auth/mod.ts";
import { handleInfo } from "../services/info_service.ts";
import { methodNotAllowed, notFound } from "../services/responses.ts";
import { handleRest } from "../services/rest_service.ts";
import { Engine } from "../engine.ts";
import { InitHandler, PushHandler, PushResponse } from "../typegate/hooks.ts";
import { upgradeTypegraph } from "../typegraph/versions.ts";
import { parseGraphQLTypeGraph } from "../graphql/graphql.ts";
import * as PrismaHooks from "../runtimes/prisma/hooks/mod.ts";
import {
  RuntimeResolver,
  SecretManager,
  TypeGraph,
  TypeGraphDS,
} from "../typegraph.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { TypeGraphRuntime } from "../runtimes/typegraph.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import { RuntimeInit, RuntimeInitParams } from "../types.ts";
import { Runtime } from "../runtimes/Runtime.ts";
import { parseTypegraph } from "../typegraph/parser.ts";
import { resolveIdentifier } from "../services/middlewares.ts";
import { handleGraphQL } from "../services/graphql_service.ts";
import { getLogger } from "../log.ts";

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

const localDir = dirname(fromFileUrl(import.meta.url));

const introspectionDef = parseGraphQLTypeGraph(
  await parseTypegraph(
    await Deno.readTextFile(join(localDir, "../typegraphs/introspection.json")),
  ),
);

export class Typegate {
  static #registeredRuntimes: Map<string, RuntimeInit> = new Map();

  static registerRuntime(name: string, init: RuntimeInit) {
    this.#registeredRuntimes.set(name, init);
  }

  static async registerRuntimes() {
    const runtimesDir = resolve(localDir, "../runtimes");
    for await (const file of Deno.readDir(runtimesDir)) {
      if (file.isFile && file.name.endsWith(".ts")) {
        await import(resolve(runtimesDir, file.name));
      }
    }
  }

  static async initRuntime(
    name: string,
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    if (this.#registeredRuntimes.size === 0) {
      await this.registerRuntimes();
    }

    const init = this.#registeredRuntimes.get(name);
    if (!init) {
      throw new Error(`Runtime ${name} is not registered`);
    }
    return await init(params);
  }

  #onPushHooks: PushHandler[] = [];
  #onInitHooks: InitHandler[] = [];

  constructor(
    public readonly register: Register,
    private limiter: RateLimiter,
  ) {
    this.#onPush((tg) => Promise.resolve(upgradeTypegraph(tg)));
    this.#onPush((tg) => Promise.resolve(parseGraphQLTypeGraph(tg)));
    this.#onPush(PrismaHooks.generateSchema);
    this.#onPush(PrismaHooks.runMigrations);
  }

  #onPush(handler: PushHandler) {
    this.#onPushHooks.push(handler);
  }

  #onInit(handler: InitHandler) {
    this.#onInitHooks.push(handler);
  }

  async #handleOnPushHooks(
    typegraph: TypeGraphDS,
    secretManager: SecretManager,
    response: PushResponse,
  ): Promise<TypeGraphDS> {
    let res = typegraph;

    for (const handler of this.#onPushHooks) {
      res = await handler(res, secretManager, response);
    }

    return res;
  }

  async #handleOnInitHooks(
    typegraph: TypeGraph,
    secretManager: SecretManager,
    sync: boolean,
  ): Promise<void> {
    await Promise.all(
      this.#onInitHooks.map((handler) =>
        handler(typegraph, secretManager, sync)
      ),
    );
  }

  async handle(request: Request, connInfo: ConnInfo): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return handleInfo(request);
      }

      const [engineName, serviceName] = parsePath(url.pathname);
      if (!engineName || ignoreList.has(engineName)) {
        return notFound;
      }

      const engine = this.register.get(engineName);
      if (!engine) {
        return notFound;
      }

      const cors = engine.tg.cors(request);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: cors,
        });
      }

      if (serviceName == "auth") {
        return handleAuth(request, engine, new Headers(cors));
      }

      const [context, headers] = await ensureJWT(
        request,
        engine,
        new Headers(cors),
      );

      const identifier = resolveIdentifier(request, engine, context, connInfo);
      const limit = await this.limiter.getLimitForEngine(engine, identifier);
      const info = {
        url,
        headers: Object.fromEntries(request.headers.entries()),
      };

      if (serviceName == "rest") {
        return handleRest(request, engine, context, info, limit, headers);
      }

      if (serviceName !== undefined) {
        return notFound;
      }
      // default to graphql service

      if (request.method === "GET" && config.debug) {
        return handlePlaygroundGraphQL(request, engine);
      }

      if (!engine.tg.tg.meta.queries.dynamic) {
        return notFound;
      }

      if (request.method !== "POST") {
        return methodNotAllowed;
      }

      return handleGraphQL(
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
      return new Response("ko", { status: 500 });
    }
  }

  async pushTypegraph(
    tgJson: string,
    secrets: Record<string, string>,
    enableIntrospection: boolean,
    system = false,
  ): Promise<[Engine, PushResponse]> {
    const tgDS = await parseTypegraph(tgJson);
    const name = TypeGraph.formatName(tgDS);

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

    // name without prefix
    const secretManager = new SecretManager(tgDS.types[0].title, secrets);

    const pushResponse = new PushResponse();
    logger.info("Handling onPush hooks");
    const tg = await this.#handleOnPushHooks(
      tgDS,
      secretManager,
      pushResponse,
    );

    logger.info(`Initializing engine '${name}'`);
    const engine = await this.initEngine(
      tg,
      secretManager,
      false,
      SystemTypegraph.getCustomRuntimes(this),
      enableIntrospection,
    );

    logger.info(`Registering engine '${name}'`);
    await this.register.add(engine);

    return [engine, pushResponse];
  }

  async initEngine(
    tgDS: TypeGraphDS,
    secretManager: SecretManager,
    sync: boolean, // redis synchronization ??
    customRuntime: RuntimeResolver = {},
    enableIntrospection: boolean,
  ): Promise<Engine> {
    const introspection = enableIntrospection
      ? await TypeGraph.init(
        introspectionDef,
        new SecretManager(introspectionDef.types[0].title, {}),
        {
          typegraph: TypeGraphRuntime.init(
            tgDS,
            [],
            {},
          ),
        },
        null,
      )
      : null;

    const tg = await TypeGraph.init(
      tgDS,
      secretManager,
      customRuntime,
      introspection,
    );

    this.#handleOnInitHooks(tg, secretManager, sync);

    const engine = new Engine(tg);
    await engine.registerEndpoints();
    return engine;
  }
}
