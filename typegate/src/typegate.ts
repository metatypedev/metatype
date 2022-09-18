import config from "./config.ts";
import { Register } from "./register.ts";
import { renderDebugAuth } from "./web/auth_debug.ts";
import { renderPlayground } from "./web/playground.ts";
import * as Sentry from "sentry";

export const typegate =
  (register: Register) => async (request: Request): Promise<Response> => {
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

      const [, lookup, service, providerName] = url.pathname.split("/");
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
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: engine.tg.cors,
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

      const { query, operationName, variables } = await request.json();
      const { status, ...res } = await engine.execute(
        query,
        operationName,
        variables,
        context,
      );

      headers.set("content-type", "application/json");
      for (const [k, v] of Object.entries(engine.tg.cors)) {
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
