// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta, sleep } from "../../utils/mod.ts";
import * as path from "@std/path";

Meta.test(
  {
    name: "Deno runtime",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno.py", {
      secrets: {
        DENO_SECRET: "deno_secret",
      },
    });

    await t.should("work on the default worker", async () => {
      await gql`
        query {
          add(first: 1.2, second: 2.3)
        }
      `
        .expectData({
          add: 3.5,
        })
        .on(e);
    });

    await t.should("work on a worker runtime", async () => {
      await gql`
        query {
          sum(numbers: [1, 2, 3, 4])
        }
      `
        .expectData({
          sum: 10,
        })
        .on(e);
    });

    // -- no worker reuse...
    // await t.should("work with global variables in a module", async () => {
    //   await gql`
    //     mutation {
    //       count
    //     }
    //   `
    //     .expectData({
    //       count: 1,
    //     })
    //     .on(e);
    //
    //   await gql`
    //     mutation {
    //       count
    //     }
    //   `
    //     .expectData({
    //       count: 2,
    //     })
    //     .on(e);
    // });

    await t.should("work with async function", async () => {
      await gql`
        query {
          max(numbers: [1, 2, 3, 4])
        }
      `
        .expectData({
          max: 4,
        })
        .on(e);
    });

    await t.should("work with static materializer", async () => {
      await gql`
        query {
          static {
            x
          }
        }
      `
        .expectData({
          static: {
            x: [1],
          },
        })
        .on(e);
    });

    await t.should("support secret injection", async () => {
      await gql`
        query {
          secrets {
            ok
          }
        }
      `
        .expectData({
          secrets: {
            ok: true,
          },
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Deno runtime: file name reloading",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno.py", {
      secrets: {
        DENO_SECRET: "deno_secret",
      },
    });

    await t.should("success for allowed network access", async () => {
      await gql`
        query {
          min(numbers: [2.5, 1.2, 4, 3])
        }
      `
        .expectData({
          min: 1.2,
        })
        .on(e);
    });

    await t.should("work with npm packages", async () => {
      await gql`
        query {
          log(number: 10000, base: 10)
        }
      `
        .expectData({
          log: 4,
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Deno runtime: use local imports",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno_dep.py");
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

Meta.test("Deno runtime with typescript", async (t) => {
  const e = await t.engine("runtimes/deno/deno_typescript.ts");
  await t.should("work with static values", async () => {
    await gql`
      query {
        static {
          a
        }
      }
    `
      .expectData({
        static: {
          a: "Hello World",
        },
      })
      .on(e);
  });

  await t.should("work with native tyepscript code", async () => {
    await gql`
      query {
        hello(name: "World")
        helloFn(name: "wOrLd")
      }
    `
      .expectData({
        hello: "Hello World",
        helloFn: "Hello world",
      })
      .on(e);
  });
});

Meta.test(
  {
    name: "DenoRuntime using TS SDK: artifacts and deps",
  },
  async (metaTest) => {
    const engine = await metaTest.engine("runtimes/deno/deno_dep.ts");

    await metaTest.should("work on imported TS modules", async () => {
      await gql`
        query {
          doAddition(a: 1, b: 2)
        }
      `
        .expectData({
          doAddition: 3,
        })
        .on(engine);
    });
  },
);

Meta.test(
  {
    name: "Deno runtime: file name reloading",
  },
  async (t) => {
    const load = async (value: number) => {
      Deno.env.set("DYNAMIC", path.join("dynamic", `${value}.ts`));
      const e = await t.engine("runtimes/deno/deno_reload.py");
      Deno.env.delete("DYNAMIC");
      return e;
    };

    const v1 = await load(1);
    await t.should("work with v1", async () => {
      await gql`
        query {
          fire
        }
      `
        .expectData({
          fire: 1,
        })
        .on(v1);
    });
    await t.unregister(v1);

    const v2 = await load(2);
    await t.should("work with v2", async () => {
      await gql`
        query {
          fire
        }
      `
        .expectData({
          fire: 2,
        })
        .on(v2);
    });
    await t.unregister(v2);
  },
);

Meta.test(
  {
    name: "Deno runtime: script reloading",
  },
  async (t) => {
    const denoScript = path.join(import.meta.dirname!, "reload", "template.ts");
    const originalContent = await Deno.readTextFile(denoScript);
    const testReload = async (value: number) => {
      try {
        Deno.env.set("DYNAMIC", "reload/template.ts");
        await Deno.writeTextFile(
          denoScript,
          originalContent.replace('"REWRITE_ME"', `${value}`),
        );
        const e = await t.engine("runtimes/deno/deno_reload.py");
        await t.should(`reload with new value ${value}`, async () => {
          await gql`
            query {
              fire
            }
          `
            .expectData({
              fire: value,
            })
            .on(e);
        });
        await t.unregister(e);
      } catch (err) {
        throw err;
      } finally {
        await Deno.writeTextFile(denoScript, originalContent);
      }
    };

    await testReload(1);
    await testReload(2);
  },
);

Meta.test(
  {
    name: "Deno runtime: infinite loop or similar",
    sanitizeOps: false,
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno.py", {
      secrets: {
        DENO_SECRET: "deno_secret",
      },
    });

    await t.should("safely fail upon stack overflow", async () => {
      await gql`
        query {
          stackOverflow(enable: true)
        }
      `
        .expectErrorContains("Maximum call stack size exceeded")
        .on(e);
    });

    await t.should("safely fail upon an infinite loop", async () => {
      await gql`
        query {
          infiniteLoop(enable: true)
        }
      `
        .expectErrorContains("timeout exceeded")
        .on(e);
    });

    const cooldownTime = 5;
    console.log(`cooldown ${cooldownTime}s`);
    await sleep(cooldownTime * 1000);
  },
);

Meta.test(
  {
    name: "Deno runtime - TS SDK: with no artifacts in sync mode",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno_typescript.ts");

    await t.should("work with no artifacts in typegrpah", async () => {
      await gql`
        query {
          hello(name: "World")
          helloFn(name: "wOrLd")
        }
      `
        .expectData({
          hello: "Hello World",
          helloFn: "Hello world",
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Deno runtime - Python SDK: with no artifacts in sync mode",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno_no_artifact.py");

    await t.should("work with no artifacts in typegrpah", async () => {
      await gql`
        query {
          simple(a: 1, b: 20)
        }
      `
        .expectData({
          simple: 21,
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Deno runtime - TS SDK: with duplicate artifacts in sync mode",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno_duplicate_artifact.ts");

    await t.should("work with duplicate artifacts in typegrpah", async () => {
      await gql`
        query {
          doAddition(a: 1, b: 2)
          doAdditionDuplicate(a: 12, b: 2)
        }
      `
        .expectData({
          doAddition: 3,
          doAdditionDuplicate: 14,
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Deno runtime - Python SDK: with duplicate artifacts in sync mode",
  },
  async (t) => {
    const e = await t.engine("runtimes/deno/deno_duplicate_artifact.py");

    await t.should("work with duplicate artifacts in typegrpah", async () => {
      await gql`
        query {
          doAddition(a: 1, b: 2)
          doAdditionDuplicate(a: 12, b: 2)
        }
      `
        .expectData({
          doAddition: 3,
          doAdditionDuplicate: 14,
        })
        .on(e);
    });
  },
);
