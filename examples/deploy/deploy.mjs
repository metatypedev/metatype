import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import { WasmEdgeRuntime } from "@typegraph/sdk/runtimes/wasmedge.js";
import { tgDeploy } from "@typegraph/sdk/tg_deploy.js";

// deno
// import { Policy, t, typegraph } from "../../typegraph/node/sdk/dist/index.js";
// import { DenoRuntime } from "../../typegraph/node/sdk/dist/runtimes/deno.js";
// import { PythonRuntime } from "../../typegraph/node/sdk/dist/runtimes/python.js";
// import { tgDeploy } from "../../typegraph/node/sdk/dist/tg_deploy.js";


const tg = typegraph({
  name: "deploy-example-node",
  disableAutoSerialization: true // disable print
}, (g) => {
    const deno = new DenoRuntime();
    const python = new PythonRuntime();
    const wasmedge = new WasmEdgeRuntime();
    const pub = Policy.public();

    g.expose({
      test: deno.static(t.struct({ a: t.string() }), { a: "HELLO" }),
      // Deno
      sayHello: deno.import(
        t.struct({ name: t.string() }),
        t.string(),
        { module: "scripts/deno/say_hello.ts", name: "sayHello" }
      ),
      sayHelloLambda: deno.func(
        t.struct({ name: t.string() }),
        t.string(),
        { code: "({ name }) => `Hello ${name} from deno lambda`" }
      ),
      // Python
      sayHelloPyLambda: python.fromLambda(
        t.struct({ name: t.string() }),
        t.string(),
        { code: `lambda obj: f"Hello {obj['name']} from python lambda"` }
      ),
      sayHelloPyMod: python.import(
        t.struct({ name: t.string() }),
        t.string(),
        {  module: "scripts/python/say_hello.py", name: "sayHello" }
      ),
      // Wasmedge
      testWasmedge: wasmedge.wasi(
        t.struct({"a": t.float(), "b": t.float()}),
        t.integer(),
        { wasm: "wasi/rust.wasm", func: "add" }
      ),
    }, pub);
  },
);

tgDeploy(tg, {
  baseUrl: "http://localhost:7890",
  cliVersion: "0.3.3",
  auth: {
    username: "admin",
    password: "password",
  },
  artifactsConfig: {
    prismaMigration: {
      action: "create",
      pathDir: "./migrations"
    }
  }
}).then((result) => {
  console.log("gate:", result);
})
  .catch(console.error);
