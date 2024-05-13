// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// import { assert, assertEquals } from "std/assert/mod.ts";
import { gql, Meta } from "test-utils/mod.ts";
// import { WitWireMessenger } from "../../../src/runtimes/wit_wire/mod.ts";
// import { QueryEngine } from "../../../src/engine/query_engine.ts";
// import type { ResolverArgs } from "../../../src/types.ts";
import { testDir } from "test-utils/dir.ts";
// import { tg } from "./python.ts";
import * as path from "std/path/mod.ts";
// import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";

const cwd = path.join(testDir, "runtimes/python");
// const auth = new BasicAuth("admin", "password");

// const localSerializedMemo = tg.serialize({
//   prismaMigration: {
//     globalAction: {
//       create: true,
//       reset: false,
//     },
//     migrationDir: "prisma-migrations",
//   },
//   dir: cwd,
// });
// const reusableTgOutput = {
//   ...tg,
//   serialize: (_: any) => localSerializedMemo,
// };

// Meta.test("Python VM performance", async (t) => {
//   await t.should("work with low latency for lambdas", async () => {
//     await using wire = await WitWireMessenger.init(
//       "inline://pyrt_wit_wire.cwasm",
//       crypto.randomUUID(),
//       [
//         {
//           op_name: "test_lambda",
//           mat_hash: "test_lambda",
//           mat_title: "test_lambda",
//           mat_data_json: JSON.stringify({
//             ty: "lambda",
//             source: "lambda x: x['a']",
//           }),
//         },
//       ],
//     );
//     const samples = await Promise.all(
//       [...Array(100).keys()].map((_i) =>
//         wire.handle(
//           "test_lambda",
//           { a: "test", _: {} } as unknown as ResolverArgs,
//         )
//       ),
//     );
//     const start = performance.now();
//     const items = await Promise.all(samples);
//     const end = performance.now();
//     const duration = end - start;

//     const randomItem = items[Math.floor(items.length * Math.random())];
//     assertEquals(randomItem, "test"); // always resolved
//     assert(
//       duration < 5,
//       `virtual machine execution was too slow: ${duration}ms`,
//     );
//   });

//   await t.should("work with low latency for defs", async () => {
//     await using wire = await WitWireMessenger.init(
//       "inline://pyrt_wit_wire.cwasm",
//       crypto.randomUUID(),
//       [
//         {
//           op_name: "test_def",
//           mat_hash: "test_def",
//           mat_title: "test_def",
//           mat_data_json: JSON.stringify({
//             ty: "def",
//             func_name: "test_def",
//             source: "def test_def(x):\n\treturn x['a']",
//           }),
//         },
//       ],
//     );
//     const samples = [...Array(100).keys()].map((_i) =>
//       wire.handle(
//         "test_def",
//         { a: "test", _: {} } as unknown as ResolverArgs,
//       )
//     );
//     const start = performance.now();
//     const items = await Promise.all(samples);
//     const end = performance.now();
//     const duration = end - start;

//     const randomItem = items[Math.floor(items.length * Math.random())];
//     assertEquals(randomItem, "test"); // always resolved
//     assert(
//       duration < 5,
//       `virtual machine execution was too slow: ${duration}ms`,
//     );
//   });
// });

// Meta.test(
//   {
//     name: "Python runtime - Python SDK",
//   },
//   async (t) => {
//     const e = await t.engine(
//       "runtimes/python/python.py",
//       cwd,
//     );

//     await t.should("work once (lambda)", async () => {
//       await gql`
//         query {
//           test(a: "test")
//         }
//       `
//         .expectData({
//           test: "test",
//         })
//         .on(e);
//     });

//     await t.should("work once (def)", async () => {
//       await gql`
//         query {
//           testDef(a: "test")
//         }
//       `
//         .expectData({
//           testDef: "test",
//         })
//         .on(e);
//     });

//     await t.should("work once (module)", async () => {
//       await gql`
//         query {
//           testMod(name: "Loyd")
//         }
//       `
//         .expectData({
//           testMod: "Hello Loyd",
//         })
//         .on(e);
//     });

//     await t.should("return same object", async () => {
//       await gql`
//         query {
//           identity(input: { a: 1234, b: { c: ["one", "two", "three"] } }) {
//             a
//             b {
//               c
//             }
//           }
//         }
//       `
//         .expectData({
//           identity: {
//             a: 1234,
//             b: { c: ["one", "two", "three"] },
//           },
//         })
//         .on(e);
//     });

//     await t.should("work fast enough", async () => {
//       const tests = [...Array(100).keys()].map((i) =>
//         gql`
//           query ($a: String!) {
//             test(a: $a)
//           }
//         `
//           .withVars({
//             a: `test${i}`,
//           })
//           .expectData({
//             test: `test${i}`,
//           })
//           .on(e)
//       );

//       const start = performance.now();
//       await Promise.all(tests);
//       const end = performance.now();
//       const duration = end - start;

//       console.log(`duration: ${duration}ms`);
//       assert(duration < 800, `Python runtime was too slow: ${duration}ms`);
//     });
//   },
// );

Meta.test(
  {
    name: "Deno: def, lambda",
  },
  async (t: any) => {
    const e = await t.engine("runtimes/python/python.ts", cwd);

    await t.should("work with def", async () => {
      await gql`
        query {
          identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityLambda: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(e);
    });

    await t.should("work with def", async () => {
      await gql`
        query {
          identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityDef: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(e);
    });
    // 'work with module import' tested down below separately, due the need for artifact/module upload
  },
);

Meta.test(
  {
    name: "Python: upload artifacts with deps",
  },
  async (metaTest: any) => {
    await metaTest.should("upload artifacts along with deps", async () => {
      const engine = await metaTest.engine("runtimes/python/python.ts", cwd);

      await gql`
        query {
          identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityMod: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(engine);
    });
  },
);

// Meta.test(
//   {
//     name: "Python: infinite loop or similar",
//     sanitizeOps: false,
//   },
//   async (t) => {
//     const e = await t.engineFromTgDeployPython(
//       "runtimes/python/python.py",
//       cwd,
//     );

//     await t.should("safely fail upon stackoverflow", async () => {
//       await gql`
//         query {
//           stackOverflow(enable: true)
//         }
//       `
//         .expectErrorContains("maximum recursion depth exceeded")
//         .on(e);
//     });

//     // let tic = 0;
//     // setTimeout(() => console.log("hearbeat", tic++), 100);

//     // FIXME: blocks main deno thread
//     // current approach on deno_bindgen apply/applyDef needs to run on
//     // separate threads
//     // #[deno] works for applys but still manages to block the current thread
//     // await t.should("safely fail upon infinite loop", async () => {
//     //   await gql`
//     //     query {
//     //       infiniteLoop(enable: true)
//     //     }
//     //   `
//     //     .expectErrorContains("timeout exceeded")
//     //     .on(e);
//     // });
//   },
// );

// Meta.test(
//   {
//     name: "Python: typegate reloading",
//   },
//   async (metaTest) => {
//     const port = metaTest.port;
//     const gate = `http://localhost:${port}`;

//     const load = async () => {
//       const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
//         reusableTgOutput,
//         {
//           baseUrl: gate,
//           auth,
//           artifactsConfig: {
//             prismaMigration: {
//               globalAction: {
//                 create: true,
//                 reset: false,
//               },
//               migrationDir: "prisma-migrations",
//             },
//             dir: cwd,
//           },
//           typegraphPath: path.join(cwd, "python.ts"),
//           secrets: {},
//         },
//       );

//       return await metaTest.engineFromDeployed(serialized);
//     };

//     const runPythonOnPython = async (currentEngine: QueryEngine) => {
//       await gql`
//         query {
//           identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           }
//           identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           }
//           identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           }
//         }
//       `
//         .expectData({
//           identityDef: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//           identityLambda: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//           identityMod: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//         })
//         .on(currentEngine);
//     };
//     const engine = await load();
//     await metaTest.should("work before typegate is reloaded", async () => {
//       await runPythonOnPython(engine);
//     });

//     // reload
//     const reloadedEngine = await load();

//     await metaTest.should("work after typegate is reloaded", async () => {
//       await runPythonOnPython(reloadedEngine);
//     });
//   },
// );
