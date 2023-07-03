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

export class Typegate {
  constructor(private register: Register, private limiter: RateLimiter) {}

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
}
