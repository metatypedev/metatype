import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";
import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { wit_utils } from "@typegraph/sdk/wit.js";
import * as path from "path";

// deno
// import { Policy, t, typegraph } from "../../typegraph/node/sdk/dist/index.js";
// import { DenoRuntime } from "../../typegraph/node/sdk/dist/runtimes/deno.js";
// import { PythonRuntime } from "../../typegraph/node/sdk/dist/runtimes/python.js";
// import { WasmRuntime } from "../../typegraph/node/sdk/dist/runtimes/wasm.js";
// import { tgDeploy } from "../../typegraph/node/sdk/dist/tg_deploy.js";
// import { PrismaRuntime } from "../../typegraph/node/sdk/dist/providers/prisma.js";
// import { BasicAuth } from "../../typegraph/node/sdk/dist/tg_deploy.js";
// import { wit_utils } from "../../typegraph/node/sdk/dist/wit.js";

const tg = await typegraph({
  name: "deploy-example-node",
}, (g) => {
  const deno = new DenoRuntime();
  const python = new PythonRuntime();
  const wasm = new WasmRuntime();
  const prisma = new PrismaRuntime("prisma", "POSTGRES");
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
      { module: "scripts/deno/say_hello.ts", name: "sayHello" },
    ),
    sayHelloLambda: deno.func(
      t.struct({ name: t.string() }),
      t.string(),
      { code: "({ name }) => `Hello ${name} from deno lambda`" },
    ),
    // Python
    sayHelloPyLambda: python.fromLambda(
      t.struct({ name: t.string() }),
      t.string(),
      { code: `lambda obj: f"Hello {obj['name']} from python lambda"` },
    ),
    sayHelloPyMod: python.import(
      t.struct({ name: t.string() }),
      t.string(),
      { module: "scripts/python/say_hello.py", name: "sayHello" },
    ),
    // Wasm
    // testWasmAdd: wasm.fromWasm(
    //   t.struct({ a: t.float(), b: t.float() }),
    //   t.integer(),
    //   { wasm: "wasm/rust.wasm", func: "add" }
    // ),
    // Prisma
    createStudent: prisma.create(student),
    findManyStudent: prisma.findMany(student),
  }, pub);
});

const artifactsConfig = {
  prismaMigration: {
    globalAction: {
      create: true,
      reset: true,
    },
    migrationDir: path.join("prisma-migrations", tg.name),
  },
};
const baseUrl = "http://localhost:7890";
const auth = new BasicAuth("admin", "password");

tgDeploy(tg, {
  baseUrl,
  auth,
  secrets: {
    POSTGRES: "postgresql://postgres:password@localhost:5432/db?schema=e2e7894",
  },
  artifactsConfig: {
    ...artifactsConfig,
    // dir: "."
  },
}).then(({ typegate }) => {
  // console.info(typegate);
  const selection = typegate?.data?.addTypegraph;
  if (selection) {
    const { migrations, messages } = selection;
    // migration status.. etc
    console.log(messages.map(({ text }) => text).join("\n"));
    migrations.map(({ runtime, migrations }) => {
      // Convention, however if migrationDir is absolute then you might want to use that instead
      // cwd + tg_name
      const baseDir = artifactsConfig.prismaMigration.migrationDir;
      // cwd + tg_name + runtime_name
      const fullPath = path.join(baseDir, runtime);
      wit_utils.unpackTarb64(migrations, fullPath);
      console.log(`Unpacked migrations at ${fullPath}`);
    });
  } else {
    throw new Error(JSON.stringify(typegate));
  }
})
  .catch(console.error);
