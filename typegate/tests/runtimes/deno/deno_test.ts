// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, test } from "../../utils.ts";

test("Deno runtime", async (t) => {
  const e = await t.pythonFile("runtimes/deno/deno.py");

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

test("Deno runtime: permissions", async (t) => {
  const e = await t.pythonFile("runtimes/deno/deno.py");

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

test("Deno runtime: use local imports", async (t) => {
  const e = await t.pythonFile("runtimes/deno/deno_dep.py");
  await t.should("work for local imports", async () => {
    await gql`
      query {
        doAddition(a: 1, b: 2)
      }
    `.expectData({
      doAddition: 3,
    }).on(e);
  });

  await t.should("work with direct code", async () => {
    await gql`
      query {
        simple(a: 1, b: 2)
      }
    `.expectData({
      simple: 3,
    }).on(e);
  });
});

// Note: deno files are uploaded when meta-cli is run (only once)
// with the current implementation reloading at runtime (post meta-cli) does not really make sense
