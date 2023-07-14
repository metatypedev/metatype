// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";
import { join } from "std/path/mod.ts";

Meta.test("Deno runtime", async (t) => {
  const e = await t.engine("runtimes/deno/deno.py");

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

  await t.should("work with global variables in a module", async () => {
    await gql`
      mutation {
        count
      }
    `
      .expectData({
        count: 1,
      })
      .on(e);

    await gql`
      mutation {
        count
      }
    `
      .expectData({
        count: 2,
      })
      .on(e);
  });

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
});

Meta.test("Deno runtime: permissions", async (t) => {
  const e = await t.engine("runtimes/deno/deno.py");

  await t.should("success for allowed network access", async () => {
    await gql`
      query {
        min1(numbers: [2.5, 1.2, 4, 3])
      }
    `.expectData({
      min1: 1.2,
    }).on(e);
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
});

Meta.test("Deno runtime: use local imports", async (t) => {
  const e = await t.engine("runtimes/deno/deno_dep.py");
  await t.should("work for local imports", async () => {
    await gql`
      query {
        doAddition(a: 1, b: 2)
      }
    `.expectData({
      doAddition: 3,
    }).on(e);
  });
});

Meta.test("Deno runtime: reloading", async (t) => {
  const load = async (value: number) => {
    Deno.env.set("DYNAMIC", join("dynamic", `${value}.ts`));
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
    `.expectData({
      fire: 1,
    }).on(v1);
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
});
