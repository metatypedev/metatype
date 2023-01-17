// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import config from "./config.ts";
import { Register } from "./register.ts";
import { renderDebugAuth } from "./web/auth_debug.ts";
import { renderPlayground } from "./web/playground.ts";
import * as Sentry from "sentry";
import { RateLimiter } from "./rate_limiter.ts";
import { ConnInfo } from "std/http/server.ts";
import { getRequestLogger } from "./log.ts";

interface ParsedPath {
  lookup: string;
  service?: string;
  providerName?: string;
}

const requestLogger = config.request_log != undefined
  ? getRequestLogger(config.request_log)
  : null;

const parsePath = (pathname: string): ParsedPath | null => {
  const arr = pathname.split("/");
  if (arr[1] === "typegate") {
    switch (arr.length) {
      case 2:
        return { lookup: "typegate" };
      case 3:
        return { lookup: arr.slice(1).join("/") };
      default:
        return null;
    }
  }
  const [, lookup, service, providerName] = arr;
  return { lookup, service, providerName };
};

export const typegate =
  (register: Register, limiter: RateLimiter) =>
  async (request: Request, connInfo: ConnInfo): Promise<Response> => {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        const info = {
          app: "typegate",
          node: `${config.hostname}:${config.tg_port}`,
          version: config.version,
          debug: config.debug,
        };
        return new Response(JSON.stringify(info), {
          headers: { "content-type": "application/json" },
        });
      }

      const parsedPath = parsePath(url.pathname);
      if (parsedPath == null) {
        return new Response("not found", {
          status: 404,
        });
      }
      const { lookup, service, providerName } = parsedPath;
      const engine = register.get(lookup);

      if (!engine) {
        return new Response("not found", {
          status: 404,
        });
      }

      if (service) {
        if (service !== "auth" || request.method !== "GET") {
          return new Response("not found", {
            status: 404,
          });
        }

        if (!providerName) {
          if (config.debug) {
            const debugAuth = await renderDebugAuth(engine, request);
            return new Response(debugAuth, {
              headers: { "content-type": "text/html" },
            });
          }

          return new Response("not found", {
            status: 404,
          });
        }

        const provider = engine.tg.auths.get(providerName);
        if (!provider) {
          return new Response("not found", {
            status: 404,
          });
        }

        return await provider.authMiddleware(request);
      }

      if (request.method === "GET" && config.debug) {
        const playground = renderPlayground(`${url.origin}/${lookup}`);
        return new Response(playground, {
          headers: { "content-type": "text/html" },
        });
      }

      // cors
      const corsHeaders = engine.tg.cors(request);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: corsHeaders,
        });
      }

      if (request.method !== "POST") {
        return new Response("method not allowed", {
          status: 405,
        });
      }

      const [context, headers] = await engine.ensureJWT(request.headers);
      // may remove this
      context.headers = Object.fromEntries(request.headers.entries());

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
        ? await limiter.limit(
          `${engine.name}:${identifier}`,
          engine.tg.tg.meta.rate.query_limit,
          engine.tg.tg.meta.rate.window_sec,
          engine.tg.tg.meta.rate.window_limit,
          engine.tg.tg.meta.rate.local_excess,
        )
        : null;

      const { query, operationName, variables } = await request.json();
      const { status, ...res } = await engine.execute(
        query,
        operationName,
        variables,
        context,
        limit,
      );

      if (requestLogger != null) {
        requestLogger.info({ req: { query, operationName, variables } });
        requestLogger.info({ res });
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
    }

    return new Response("ko", { status: 500 });
  };
