// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import config from "../config.ts";
import { Register } from "./register.ts";
import * as Sentry from "sentry";
import { RateLimiter } from "./rate_limiter.ts";
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
import { PushHandler, PushResponse } from "../typegate/hooks.ts";
import { upgradeTypegraph } from "../typegraph/versions.ts";
import { parseGraphQLTypeGraph } from "../transports/graphql/typegraph.ts";
import * as PrismaHooks from "../runtimes/prisma/hooks/mod.ts";
import {
  RuntimeResolver,
  SecretManager,
  TypeGraph,
  TypeGraphDS,
} from "../typegraph/mod.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { TypeGraphRuntime } from "../runtimes/typegraph.ts";
import { resolveIdentifier } from "../services/middlewares.ts";
import { handleGraphQL } from "../services/graphql_service.ts";
import { getLogger } from "../log.ts";
import { MigrationFailure } from "../runtimes/prisma/hooks/run_migrations.ts";
import introspectionJson from "../typegraphs/introspection.json" with {
  type: "json",
};

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

export class Typegate {
  #onPushHooks: PushHandler[] = [];

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

  async #handleOnPushHooks(
    typegraph: TypeGraphDS,
    secretManager: SecretManager,
    response: PushResponse,
  ): Promise<TypeGraphDS> {
    let res = typegraph;

    for (const handler of this.#onPushHooks) {
      try {
        res = await handler(res, secretManager, response);
      } catch (e) {
        logger.error(`Error in onPush hook: ${e}`);
        if (e instanceof MigrationFailure) {
          response.setFailure(e.errors[0]);
        } else {
          response.setFailure({
            reason: "Unknown",
            message: e.toString(),
          });
        }
      }
    }

    return res;
  }

  async handle(
    request: Request,
    connInfo: Deno.ServeHandlerInfo,
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return handleInfo(request);
      }

      const [engineName, serviceName] = parsePath(url.pathname);
      if (!engineName || ignoreList.has(engineName)) {
        return notFound();
      }

      const engine = this.register.get(engineName);
      if (!engine) {
        return notFound();
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
        return jsonError(jwtCheck.message, new Headers(), 401);
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

      if (request.method === "GET" && config.debug) {
        return handlePlaygroundGraphQL(request, engine);
      }

      if (!engine.tg.tg.meta.queries.dynamic) {
        return notFound();
      }

      if (request.method !== "POST") {
        return methodNotAllowed();
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

    const secretManager = new SecretManager(
      tgJson,
      secrets,
    );

    const pushResponse = new PushResponse();
    logger.info("Handling onPush hooks");
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

    logger.info(`Initializing engine '${name}'`);
    const engine = await this.initQueryEngine(
      tg,
      secretManager,
      SystemTypegraph.getCustomRuntimes(this),
      enableIntrospection,
    );

    logger.info(`Registering engine '${name}'`);
    await this.register.add(engine);

    return {
      name,
      engine,
      response: pushResponse,
    };
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

    const introspection = enableIntrospection
      ? await TypeGraph.init(
        introspectionDef,
        new SecretManager(introspectionDef, {}),
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

    const engine = new QueryEngine(tg);
    await engine.registerEndpoints();
    return engine;
  }
}
