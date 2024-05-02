// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta, sleep as _sleep } from "../../utils/mod.ts";
import * as path from "std/path/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { denoDepTg } from "./deno_dep.ts";
import {
  BasicAuth,
  tgDeploy as _tgDeploy,
  tgRemove as _tgRemove,
} from "@typegraph/sdk/tg_deploy.js";

const cwd = path.join(testDir, "runtimes/deno");
const _auth = new BasicAuth("admin", "password");

const localSerializedMemo = denoDepTg.serialize({
  prismaMigration: {
    globalAction: {
      create: true,
      reset: false,
    },
    migrationDir: "prisma-migrations",
  },
  dir: cwd,
});
const _reusableTgOutput = {
  ...denoDepTg,
  serialize: (_: any) => localSerializedMemo,
};

// Meta.test(
//   {
//     name: "Deno runtime",
//     port: true,
//     systemTypegraphs: true,
//   },
//   async (t) => {
//     const e = await t.engineFromTgDeployPython("runtimes/deno/deno.py", cwd);

//     await t.should("work on the default worker", async () => {
//       await gql`
//         query {
//           add(first: 1.2, second: 2.3)
//         }
//       `
//         .expectData({
//           add: 3.5,
//         })
//         .on(e);
//     });

//     await t.should("work on a worker runtime", async () => {
//       await gql`
//         query {
//           sum(numbers: [1, 2, 3, 4])
//         }
//       `
//         .expectData({
//           sum: 10,
//         })
//         .on(e);
//     });

//     await t.should("work with global variables in a module", async () => {
//       await gql`
//         mutation {
//           count
//         }
//       `
//         .expectData({
//           count: 1,
//         })
//         .on(e);

//       await gql`
//         mutation {
//           count
//         }
//       `
//         .expectData({
//           count: 2,
//         })
//         .on(e);
//     });

//     await t.should("work with async function", async () => {
//       await gql`
//         query {
//           max(numbers: [1, 2, 3, 4])
//         }
//       `
//         .expectData({
//           max: 4,
//         })
//         .on(e);
//     });

//     await t.should("work with static materializer", async () => {
//       await gql`
//         query {
//           static {
//             x
//           }
//         }
//       `
//         .expectData({
//           static: {
//             x: [1],
//           },
//         })
//         .on(e);
//     });
//   },
// );

// Meta.test(
//   {
//     name: "Deno runtime: file name reloading",
//     port: true,
//     systemTypegraphs: true,
//   },
//   async (t) => {
//     const e = await t.engineFromTgDeployPython("runtimes/deno/deno.py", cwd);

//     await t.should("success for allowed network access", async () => {
//       await gql`
//         query {
//           min(numbers: [2.5, 1.2, 4, 3])
//         }
//       `
//         .expectData({
//           min: 1.2,
//         })
//         .on(e);
//     });

//     await t.should("work with npm packages", async () => {
//       await gql`
//         query {
//           log(number: 10000, base: 10)
//         }
//       `
//         .expectData({
//           log: 4,
//         })
//         .on(e);
//     });
//   },
// );

Meta.test(
  {
    name: "Deno runtime: use local imports",
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/deno/deno_dep.py",
      cwd,
    );
    await t.should("work for local imports", async () => {
      await gql`
        query {
          doAddition(a: 1, b: 2)
        }
      `
        .expectData({
          doAddition: 3,
        })
        .on(e);
    });
  },
);

// Meta.test("Deno runtime with typescript", async (t) => {
//   const e = await t.engine("runtimes/deno/deno_typescript.ts");
//   await t.should("work with static values", async () => {
//     await gql`
//       query {
//         static {
//           a
//         }
//       }
//     `
//       .expectData({
//         static: {
//           a: "Hello World",
//         },
//       })
//       .on(e);
//   });

//   await t.should("work with native tyepscript code", async () => {
//     await gql`
//       query {
//         hello(name: "World")
//         helloFn(name: "wOrLd")
//       }
//     `
//       .expectData({
//         hello: "Hello World",
//         helloFn: "Hello world",
//       })
//       .on(e);
//   });
// });

// Meta.test(
//   {
//     name: "DenoRuntime using TS SDK: artifacts and deps",
//     port: true,
//     systemTypegraphs: true,
//   },
//   async (metaTest) => {
//     const port = metaTest.port;
//     const gate = `http://localhost:${port}`;

//     const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
//       reusableTgOutput,
//       {
//         baseUrl: gate,
//         auth,
//         artifactsConfig: {
//           prismaMigration: {
//             globalAction: {
//               create: true,
//               reset: false,
//             },
//             migrationDir: "prisma-migrations",
//           },
//           dir: cwd,
//         },
//         typegraphPath: path.join(cwd, "deno_dep.ts"),
//         secrets: {},
//       },
//     );

//     const engine = await metaTest.engineFromDeployed(serialized);

//     await metaTest.should("work on imported TS modules", async () => {
//       await gql`
//         query {
//           doAddition(a: 1, b: 2)
//         }
//       `
//         .expectData({
//           doAddition: 3,
//         })
//         .on(engine);
//     });

//     const { typegate: _gateResponseRem } = await tgRemove(reusableTgOutput, {
//       baseUrl: gate,
//       auth,
//     });
//   },
// );

// Meta.test(
//   {
//     name: "Deno runtime: file name reloading",
//     port: true,
//     systemTypegraphs: true,
//   },
//   async (t) => {
//     const load = async (value: number) => {
//       Deno.env.set("DYNAMIC", path.join("dynamic", `${value}.ts`));
//       const e = await t.engineFromTgDeployPython(
//         "runtimes/deno/deno_reload.py",
//         cwd,
//       );
//       Deno.env.delete("DYNAMIC");
//       return e;
//     };

//     const v1 = await load(1);
//     await t.should("work with v1", async () => {
//       await gql`
//         query {
//           fire
//         }
//       `
//         .expectData({
//           fire: 1,
//         })
//         .on(v1);
//     });
//     await t.unregister(v1);

//     const v2 = await load(2);
//     await t.should("work with v2", async () => {
//       await gql`
//         query {
//           fire
//         }
//       `
//         .expectData({
//           fire: 2,
//         })
//         .on(v2);
//     });
//     await t.unregister(v2);
//   },
// );

// Meta.test(
//   {
//     name: "Deno runtime: script reloading",
//     port: true,
//     systemTypegraphs: true,
//   },
//   async (t) => {
//     const denoScript = path.join(
//       "typegate/tests/runtimes/deno",
//       "reload",
//       "template.ts",
//     );
//     const originalContent = await Deno.readTextFile(denoScript);
//     const testReload = async (value: number) => {
//       try {
//         Deno.env.set("DYNAMIC", "reload/template.ts");
//         await Deno.writeTextFile(
//           denoScript,
//           originalContent.replace('"REWRITE_ME"', `${value}`),
//         );
//         const e = await t.engineFromTgDeployPython(
//           "runtimes/deno/deno_reload.py",
//           cwd,
//         );
//         await t.should(`reload with new value ${value}`, async () => {
//           await gql`
//             query {
//               fire
//             }
//           `
//             .expectData({
//               fire: value,
//             })
//             .on(e);
//         });
//         await t.unregister(e);
//       } catch (err) {
//         throw err;
//       } finally {
//         await Deno.writeTextFile(denoScript, originalContent);
//       }
//     };

//     await testReload(1);
//     await testReload(2);
//   },
// );

// Meta.test(
//   {
//     name: "Deno runtime: infinite loop or similar",
//     sanitizeOps: false,
//     port: true,
//     systemTypegraphs: true,
//   },
//   async (t) => {
//     const e = await t.engineFromTgDeployPython("runtimes/deno/deno.py", cwd);

//     await t.should("safely fail upon stack overflow", async () => {
//       await gql`
//         query {
//           stackOverflow(enable: true)
//         }
//       `
//         .expectErrorContains("Maximum call stack size exceeded")
//         .on(e);
//     });

//     await t.should("safely fail upon an infinite loop", async () => {
//       await gql`
//         query {
//           infiniteLoop(enable: true)
//         }
//       `
//         .expectErrorContains("timeout exceeded")
//         .on(e);
//     });

//     const cooldownTime = 5;
//     console.log(`cooldown ${cooldownTime}s`);
//     await sleep(cooldownTime * 1000);
//   },
// );
