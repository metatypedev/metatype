import { serve } from "std/http/server.ts";
import * as Sentry from "sentry";
import { renderPlayground } from "./web/playground.ts";
import { get_version, init } from "../../bindings/bindings.ts";

import { register } from "./register.ts";
import config from "./config.ts";
import { getLogger } from "./log.ts";
import { renderDebugAuth } from "./web/auth-debug.ts";
import { deleteCookie } from "https://deno.land/std@0.154.0/http/cookie.ts";

const version = get_version();

if (config.sentry_dsn) {
  Sentry.init({
    dsn: config.sentry_dsn,
    release: version,
    environment: config.debug ? "development" : "production",
    sampleRate: config.sentry_sample_rate,
    tracesSampleRate: config.sentry_traces_sample_rate,
  });
}

init();

const server = serve(
  async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        const info = {
          app: "typegate",
          node: `${config.hostname}:${config.tg_port}`,
          version,
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

      if (request.method === "GET") {
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
  },
  { port: config.tg_port },
);

if (config.debug) {
  (function reload(backoff = 3) {
    fetch(
      `http://localhost:5000/dev?node=${encodeURI(config.tg_external_url)}`,
    ).catch((e) => {
      setTimeout(reload, 200, backoff - 1);
    });
  })();
}

getLogger().info(`Listening on ${config.tg_port}`);
await server;
