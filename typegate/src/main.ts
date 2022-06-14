import { serve } from "std/http/server.ts";
import { renderPlayground } from "./web/playground.ts";
import { init } from "../native/bindings/bindings.ts";

import { register } from "./register.ts";
import config from "./config.ts";
import { Engine } from "./engine.ts";

/*
//const wasmCode = await Deno.readFile("../example/wasm/pkg/wasm_bg.wasm");
const wasmCode = await Deno.readFile(
  "../example/wasm/target/wasm32-wasi/release/wasm.wasm"
);
const wasmModule = new WebAssembly.Module(wasmCode);
const externs = WebAssembly.Module.imports(wasmModule);
console.log(externs);

const exports: Record<string, any> = {};

const imports: any = {
  wbg: externs.reduce((agg, { name, module, kind }) => {
    const subname = name.match(/^__wbg_([a-zA-Z0-9_]+)_[a-zA-Z0-9]+$/) ?? [];
    return {
      ...agg,
      [name]: exports[subname[1]],
    };
  }, {}),
};

const wasmInstance = new WebAssembly.Instance(wasmModule);
const add = wasmInstance.exports.add as CallableFunction;
console.log(add(2, 3));
*/

init();

const server = serve(
  async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        const info = {
          app: "Typegate",
          hostname: config.hostname,
          node: `${config.tg_host}:${config.tg_port}`,
          version: config.version,
          debug: config.debug,
        };
        return new Response(JSON.stringify(info), {
          headers: { "content-type": "application/json" },
        });
      }

      const lookup = url.pathname.substring(1);

      if (!register.has(lookup)) {
        return new Response("not found", {
          status: 404,
        });
      }

      const headers = Object.fromEntries(request.headers.entries());
      const { method } = request;

      const origin = headers["origin"];
      // FIXME change
      const cors = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "60",
      };

      // cors
      if (method === "OPTIONS") {
        return new Response(null, {
          headers: cors,
        });
      }

      if (method === "GET") {
        const playground = renderPlayground({
          endpoint: `${url.origin}/${lookup}`,
        });
        return new Response(playground, {
          headers: { "content-type": "text/html" },
        });
      }

      if (method !== "POST") {
        return new Response("method not allowed", {
          status: 405,
        });
      }

      const { query, operationName, variables } = await request.json();
      const engine = register.get(lookup) as Engine;
      const { status, ...res } = await engine.execute(
        query,
        operationName,
        variables,
        headers,
      );
      return new Response(JSON.stringify(res), {
        headers: {
          "content-type": "application/json",
          ...cors, // chrome expects/considers cors headers in reponse as well
        },
        status,
      });
    } catch (e) {
      console.error(e);
    }

    return new Response("ko", { status: 500 });
  },
  { port: config.tg_port },
);

if (config.debug) {
  (function reload(backoff = 3) {
    fetch(
      `http://localhost:5000/dev?node=${config.tg_host}:${config.tg_port}`,
    ).catch((e) => {
      setTimeout(reload, 200, backoff - 1);
    });
  })();
}

await server;
