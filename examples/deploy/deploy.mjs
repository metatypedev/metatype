import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import { WasmEdgeRuntime } from "@typegraph/sdk/runtimes/wasmedge.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";
import { tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { wit_utils } from "@typegraph/sdk/wit.js";
import * as path from "path";


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
    const prisma = new PrismaRuntime("prisma", "POSTGRES")
    const pub = Policy.public();
    const student = t.struct(
      {
        id: t.integer({}, { asId: true }),
        name: t.string(),
      },
      { name: "Student" },
    );
  
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
      // Prisma
      createStudent: prisma.create(student),
      findManyStudent: prisma.findMany(student),
    }, pub);
  },
);

const artifactsConfig = {
  prismaMigration: {
    action: {
      create: true,
      reset: false
    },
    migrationDir: "prisma-migrations"
  }
};


tgDeploy(tg, {
  baseUrl: "http://localhost:7890",
  cliVersion: "0.3.3",
  auth: {
    username: "admin",
    password: "password",
  },
  secrets: {
    TG_DEPLOY_EXAMPLE_NODE_POSTGRES: "postgresql://postgres:password@localhost:5432/db?schema=e2e7894"
  },
  artifactsConfig,
}).then((result) => {
  console.log("[OK] Pushed.");
  const selection = result.data.addTypegraph;
  if (selection) {
    const { migrations, messages } = selection;
    console.log(messages.map(({ text }) => text).join("\n"));
    migrations.map(({ runtime, migrations }) => {
      const baseDir = artifactsConfig.prismaMigration.migrationDir;
      const fullPath = path.join(baseDir, tg.name, runtime);
      wit_utils.unpackTarb64(migrations,  fullPath);
      console.log(`Unpacked migrations at ${fullPath}`)
    });
  }
})
  .catch(console.error);
