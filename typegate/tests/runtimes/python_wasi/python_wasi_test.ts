// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assert, assertEquals } from "std/assert/mod.ts";
import { gql, Meta } from "../../utils/mod.ts";
import { PythonVirtualMachine } from "../../../src/runtimes/python_wasi/python_vm.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./python_wasi.ts";
import * as path from "std/path/mod.ts";
import { QueryEngine } from "../../../src/engine/query_engine.ts";
import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";

const cwd = path.join(testDir, "runtimes/python_wasi");
const auth = new BasicAuth("admin", "password");

const localSerializedMemo = tg.serialize({
  prismaMigration: {
    globalAction: {
      create: true,
      reset: false,
    },
    migrationDir: "prisma-migrations",
  },
  dir: cwd,
});
const reusableTgOutput = {
  ...tg,
  serialize: (_: any) => localSerializedMemo,
};

Meta.test("Python WASI VM performance", async (t) => {
  const vm = new PythonVirtualMachine();
  await vm.setup("myVm");

  await t.should("work with low latency for lambdas", async () => {
    await vm.registerLambda("test", "lambda x: x['a']");
    const samples = [...Array(100).keys()].map((i) =>
      vm.applyLambda(i, "test", [{ a: "test" }])
    );
    const start = performance.now();
    const items = await Promise.all(samples);
    const end = performance.now();
    const duration = end - start;

    const randomItem = items[Math.floor(items.length * Math.random())];
    assertEquals(randomItem, "test"); // always resolved
    assert(
      duration < 5,
      `virtual machine execution was too slow: ${duration}ms`,
    );
  });

  await t.should("work with low latency for defs", async () => {
    await vm.registerDef("test", "def test(x):\n\treturn x['a']");
    const samples = [...Array(100).keys()].map((i) =>
      vm.applyDef(i, "test", [{ a: "test" }])
    );
    const start = performance.now();
    const items = await Promise.all(samples);
    const end = performance.now();
    const duration = end - start;

    const randomItem = items[Math.floor(items.length * Math.random())];
    assertEquals(randomItem, "test"); // always resolved
    assert(
      duration < 5,
      `virtual machine execution was too slow: ${duration}ms`,
    );
  });

  await vm.destroy();
});

Meta.test(
  {
    name: "Python WASI runtime",
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python_wasi/python_wasi.py",
      cwd,
    );

    await t.should("work once (lambda)", async () => {
      await gql`
        query {
          test(a: "test")
        }
      `
        .expectData({
          test: "test",
        })
        .on(e);
    });

    await t.should("work once (def)", async () => {
      await gql`
        query {
          testDef(a: "test")
        }
      `
        .expectData({
          testDef: "test",
        })
        .on(e);
    });

    await t.should("work once (module)", async () => {
      await gql`
        query {
          testMod(name: "Loyd")
        }
      `
        .expectData({
          testMod: "Hello Loyd",
        })
        .on(e);
    });

    await t.should("return same object", async () => {
      await gql`
        query {
          identity(input: { a: 1234, b: { c: ["one", "two", "three"] } }) {
            a
            b {
              c
            }
          }
        }
      `
        .expectData({
          identity: {
            a: 1234,
            b: { c: ["one", "two", "three"] },
          },
        })
        .on(e);
    });

    await t.should("work fast enough", async () => {
      const tests = [...Array(100).keys()].map((i) =>
        gql`
          query ($a: String!) {
            test(a: $a)
          }
        `
          .withVars({
            a: `test${i}`,
          })
          .expectData({
            test: `test${i}`,
          })
          .on(e)
      );

      const start = performance.now();
      await Promise.all(tests);
      const end = performance.now();
      const duration = end - start;

      console.log(`duration: ${duration}ms`);
      assert(duration < 800, `Python WASI runtime was too slow: ${duration}ms`);
    });
  },
);

Meta.test(
  {
    name: "Deno: def, lambda",
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    const port = t.port;
    const gate = `http://localhost:${port}`;

    const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
      reusableTgOutput,
      {
        baseUrl: gate,
        auth,
        artifactsConfig: {
          prismaMigration: {
            globalAction: {
              create: true,
              reset: false,
            },
            migrationDir: "prisma-migrations",
          },
          dir: cwd,
        },
        typegraphPath: path.join(cwd, "python_wasi.ts"),
        secrets: {},
      },
    );

    const e = await t.engineFromDeployed(serialized);

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
    name: "Python WASI: infinite loop or similar",
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python_wasi/python_wasi.py",
      cwd,
    );

    await t.should("safely fail upon stackoverflow", async () => {
      await gql`
        query {
          stackOverflow(enable: true)
        }
      `
        .expectErrorContains("maximum recursion depth exceeded")
        .on(e);
    });

    // let tic = 0;
    // setTimeout(() => console.log("hearbeat", tic++), 100);

    // FIXME: blocks main deno thread
    // current approach on deno_bindgen apply/applyDef needs to run on
    // separate threads
    // #[deno] works for applys but still manages to block the current thread
    // await t.should("safely fail upon infinite loop", async () => {
    //   await gql`
    //     query {
    //       infiniteLoop(enable: true)
    //     }
    //   `
    //     .expectErrorContains("timeout exceeded")
    //     .on(e);
    // });
  },
);

Meta.test(
  {
    name: "Python WASI: reloading typegate",
    port: true,
    systemTypegraphs: true,
  },
  async (metaTest) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    const load = async () => {
      const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
        reusableTgOutput,
        {
          baseUrl: gate,
          auth,
          artifactsConfig: {
            prismaMigration: {
              globalAction: {
                create: true,
                reset: false,
              },
              migrationDir: "prisma-migrations",
            },
            dir: cwd,
          },
          typegraphPath: path.join(cwd, "wasm.ts"),
          secrets: {},
        },
      );

      return await metaTest.engineFromDeployed(serialized);
    };

    const runPythonOnPythonWasi = async (currentEngine: QueryEngine) => {
      await gql`
        query {
          identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
          identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
          identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
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
          identityLambda: {
            a: "hello",
            b: [1, 2, "three"],
          },
          identityMod: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(currentEngine);
    };
    const engine = await load();
    await metaTest.should("work before typegate is reloaded", async () => {
      await runPythonOnPythonWasi(engine);
    });

    // reload
    const reloadedEngine = await load();

    await metaTest.should("work after typegate is reloaded", async () => {
      await runPythonOnPythonWasi(reloadedEngine);
    });
  },
);

Meta.test(
  {
    name: "Python WASI: upload artifacts with deps",
    port: true,
    systemTypegraphs: true,
  },
  async (metaTest) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    await metaTest.should("upload artifacts along with deps", async () => {
      const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
        reusableTgOutput,
        {
          baseUrl: gate,
          auth,
          artifactsConfig: {
            prismaMigration: {
              globalAction: {
                create: true,
                reset: false,
              },
              migrationDir: "prisma-migrations",
            },
            dir: cwd,
          },
          typegraphPath: path.join(cwd, "pyton_wasi.ts"),
          secrets: {},
        },
      );

      const engine = await metaTest.engineFromDeployed(serialized);

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

Meta.test(
  {
    name: "Python WASI: infinite loop or similar",
    sanitizeOps: false,
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python_wasi/python_wasi.py",
      cwd,
    );

    await t.should("safely fail upon stackoverflow", async () => {
      await gql`
        query {
          stackOverflow(enable: true)
        }
      `
        .expectErrorContains("maximum recursion depth exceeded")
        .on(e);
    });

    // let tic = 0;
    // setTimeout(() => console.log("hearbeat", tic++), 100);

    // FIXME: blocks main deno thread
    // current approach on deno_bindgen apply/applyDef needs to run on
    // separate threads
    // #[deno] works for applys but still manages to block the current thread
    // await t.should("safely fail upon infinite loop", async () => {
    //   await gql`
    //     query {
    //       infiniteLoop(enable: true)
    //     }
    //   `
    //     .expectErrorContains("timeout exceeded")
    //     .on(e);
    // });
  },
);

Meta.test(
  {
    name: "Python WASI: typegate reloading",
    port: true,
    systemTypegraphs: true,
  },
  async (metaTest) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    const load = async () => {
      const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
        reusableTgOutput,
        {
          baseUrl: gate,
          auth,
          artifactsConfig: {
            prismaMigration: {
              globalAction: {
                create: true,
                reset: false,
              },
              migrationDir: "prisma-migrations",
            },
            dir: cwd,
          },
          typegraphPath: path.join(cwd, "python_wasi.ts"),
          secrets: {},
        },
      );

      return await metaTest.engineFromDeployed(serialized);
    };

    const runPythonOnPythonWasi = async (currentEngine: QueryEngine) => {
      await gql`
        query {
          identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
          identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
          identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
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
          identityLambda: {
            a: "hello",
            b: [1, 2, "three"],
          },
          identityMod: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(currentEngine);
    };
    const engine = await load();
    await metaTest.should("work before typegate is reloaded", async () => {
      await runPythonOnPythonWasi(engine);
    });

    // reload
    const reloadedEngine = await load();

    await metaTest.should("work after typegate is reloaded", async () => {
      await runPythonOnPythonWasi(reloadedEngine);
    });
  },
);
