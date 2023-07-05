// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import config from "../config.ts";
import { Register } from "./register.ts";
import { renderPlayground } from "../web/playground.ts";
import * as Sentry from "sentry";
import { RateLimiter } from "./rate_limiter.ts";
import { ConnInfo } from "std/http/server.ts";
import { getLogger } from "../log.ts";
import { forceAnyToOption } from "../utils.ts";
import { Operations, parseRequest } from "../graphql/request_parser.ts";
import { handleAuthService } from "../auth/auth.ts";
import { Engine } from "../engine.ts";
import { InitHandler, PushHandler, PushResponse } from "../typegate/hooks.ts";
import { upgradeTypegraph } from "../typegraph/versions.ts";
import { parseGraphQLTypeGraph } from "../graphql/graphql.ts";
import { runMigrations } from "../runtimes/prisma/hooks/run_migrations.ts";
import {
  RuntimeResolver,
  SecretManager,
  TypeGraph,
  TypeGraphDS,
} from "../typegraph.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { TypeGraphRuntime } from "../runtimes/typegraph.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { RuntimeInit, RuntimeInitParams } from "../types.ts";
import { Runtime } from "../runtimes/Runtime.ts";
import { S3Runtime } from "../runtimes/s3.ts";
import { GraphQLRuntime } from "../runtimes/graphql.ts";
import { PrismaRuntime } from "../runtimes/prisma/prisma.ts";
import { HTTPRuntime } from "../runtimes/http.ts";
import { DenoRuntime } from "../runtimes/deno/deno.ts";
import { TemporalRuntime } from "../runtimes/temporal.ts";
import { RandomRuntime } from "../runtimes/random.ts";
import { WasmEdgeRuntime } from "../runtimes/wasmedge.ts";
import { PythonWasiRuntime } from "../runtimes/python_wasi/python_wasi.ts";
import { parseTypegraph } from "../typegraph/parser.ts";

const logger = getLogger("http");

type Service = (req: Request, engine: Engine) => Promise<Response | null>;

const services: Record<string, Service> = {
  auth: handleAuthService,
};

const silenceList = new Set(["favicon.ico"]);

const parsePath = (
  pathname: string,
): [string, string | undefined] => {
  const [engineName, serviceName] = pathname.split("/").slice(1, 3);
  if (engineName === "typegate") {
    // if path starts with typegate, there is no service
    // and typegraph correspond to full path
    return [pathname.slice(1), undefined];
  }
  return [engineName ?? "", serviceName];
};

const localDir = dirname(fromFileUrl(import.meta.url));

const introspectionDef = parseGraphQLTypeGraph(
  await parseTypegraph(
    await Deno.readTextFile(join(localDir, "../typegraphs/introspection.json")),
  ),
);

export class Typegate {
  static #registeredRuntimes: Map<string, RuntimeInit> = new Map();

  static #registerRuntime(name: string, init: RuntimeInit) {
    this.#registeredRuntimes.set(name, init);
  }

  static #registerRuntimes() {
    this.#registerRuntime("s3", S3Runtime.init);
    this.#registerRuntime("graphql", GraphQLRuntime.init);
    this.#registerRuntime("prisma", PrismaRuntime.init);
    this.#registerRuntime("http", HTTPRuntime.init);
    this.#registerRuntime("deno", DenoRuntime.init);
    this.#registerRuntime("temporal", TemporalRuntime.init);
    this.#registerRuntime("random", RandomRuntime.init);
    this.#registerRuntime("wasmedge", WasmEdgeRuntime.init);
    this.#registerRuntime("python_wasi", PythonWasiRuntime.init);
  }

  static async initRuntime(
    name: string,
    params: RuntimeInitParams,
  ): Promise<Runtime> {
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
    this.#onPush(runMigrations);
    Typegate.#registerRuntimes();
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
        const info = {
          app: "typegate",
        };
        return new Response(JSON.stringify(info), {
          headers: {
            "content-type": "application/json",
          },
        });
      }

      const [engineName, serviceName] = parsePath(url.pathname);

      const engine = this.register.get(engineName);
      if (!engine) {
        if (!silenceList.has(engineName)) {
          logger.info(`typegraph not found: ${engineName}`);
        }
        return new Response("not found", {
          status: 404,
        });
      }

      // cors
      const corsHeaders = engine.tg.cors(request);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: corsHeaders,
        });
      }

      if (serviceName) {
        const service = services[serviceName];
        const response = service ? await service(request, engine) : null;
        if (response) {
          for (const [k, v] of Object.entries(corsHeaders)) {
            response.headers.set(k, v);
          }
          return response;
        }
        return new Response("not found", {
          status: 404,
        });
      }

      if (request.method === "GET" && config.debug) {
        const forwarded_scheme = request.headers.get("x-forwarded-scheme");
        const forwarded_host = request.headers.get("x-forwarded-host");
        const targetUrl = (forwarded_scheme && forwarded_host)
          ? `${forwarded_scheme}://${forwarded_host}`
          : url.origin;
        const playground = renderPlayground(
          `${targetUrl}/${engineName}`,
          this.register.list().map((e) => e.name),
        );
        return new Response(playground, {
          headers: { "content-type": "text/html" },
        });
      }

      if (request.method !== "POST") {
        return new Response("method not allowed", {
          status: 405,
        });
      }

      const [context, headers] = await engine.ensureJWT(
        request.headers,
        url,
      );

      const identifier = (
        engine.tg.tg.meta.rate?.context_identifier
          ? context[engine.tg.tg.meta.rate?.context_identifier]
          : null
      ) ??
        (config.trust_proxy
          ? request.headers.get(config.trust_header_ip)
          : null) ??
        (connInfo.remoteAddr as Deno.NetAddr).hostname;

      // FIX bad serialization of rate (current: array if no object)
      const limit = engine.tg.tg.meta.rate &&
          !Array.isArray(engine.tg.tg.meta.rate)
        ? await this.limiter.limit(
          `${engine.name}:${identifier}`,
          engine.tg.tg.meta.rate.query_limit,
          engine.tg.tg.meta.rate.window_sec,
          engine.tg.tg.meta.rate.window_limit,
          engine.tg.tg.meta.rate.local_excess,
        )
        : null;

      let content: Operations | null = null;
      try {
        content = await parseRequest(request);
      } catch (e) {
        return new Response(`bad request: ${e.message}`, { status: 400 });
      }
      const { query, operationName, variables } = content;

      const info = {
        url,
        headers: Object.fromEntries(request.headers.entries()),
      };
      const { status, ...res } = await engine.execute(
        query,
        forceAnyToOption(operationName),
        variables,
        context,
        info,
        limit,
      );

      if (
        engineName !== "typegate" && (!operationName ||
          !operationName.toLowerCase().includes("introspection"))
      ) {
        logger.debug({ req: { query, operationName, variables }, res });
      }

      headers.set("content-type", "application/json");
      for (const [k, v] of Object.entries(corsHeaders)) {
        headers.set(k, v);
      }

      return new Response(JSON.stringify(res), {
        headers,
        status,
      });
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

    return new Engine(tg);
  }
}
