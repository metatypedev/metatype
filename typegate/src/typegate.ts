// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import config from "./config.ts";
import { Register } from "./register.ts";
import * as Sentry from "sentry";
import { RateLimiter } from "./rate_limiter.ts";
import { ConnInfo } from "std/http/server.ts";
import { handlePlayground } from "./services/playground_service.ts";
import { handleAuth } from "./services/auth/mod.ts";
import { handleInfo } from "./services/info_service.ts";
import { methodNotAllowed, notFound } from "./services/responses.ts";
import { handleRest } from "./services/rest_service.ts";
import { resolveIdentifier } from "./services/middlewares.ts";
import { ensureJWT } from "./services/auth/mod.ts";
import { handleGraphQL } from "./services/graphql_service.ts";

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

export const typegate =
  (register: Register, limiter: RateLimiter) =>
  async (request: Request, connInfo: ConnInfo): Promise<Response> => {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return handleInfo(request);
      }

      const [engineName, serviceName] = parsePath(url.pathname);
      if (!engineName || ignoreList.has(engineName)) {
        return notFound;
      }

      const engine = register.get(engineName);
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
      const limit = await limiter.getLimitForEngine(engine, identifier);
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
        return handlePlayground(request, engine);
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
  };
