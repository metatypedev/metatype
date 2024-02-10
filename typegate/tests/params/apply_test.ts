// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("(python (sdk): apply)", async (t) => {
  const e = await t.engine("params/apply.py", {
    secrets: {
      "MY_SECRET": "supersecret",
    },
  });

  await t.should("work with renamed params", async () => {
    await gql`
      query {
        renamed(first: 1, second: 2) {
          a b
        }
      }
    `
      .expectData({
        renamed: { a: 1, b: 2 },
      })
      .on(e);
  });

  await t.should("work with renamed params", async () => {
    await gql`
      query {
        flattened(a1: 1, a2: 2, b11: 3, b12: 4, b2: 5) {
          a { a1 a2 }
          b { b1 { b11 b12 } b2 }
        }
      }
    `
      .expectData({
        flattened: {
          a: { a1: 1, a2: 2 },
          b: { b1: { b11: 3, b12: 4 }, b2: 5 },
        },
      })
      .on(e);
  });

  await t.should("work with context", async () => {
    await gql`
      query {
        withContext(first: 1) {
          a
          b
        }
      }
    `
      .withContext({ context_key: "hum" })
      .expectData({
        withContext: { a: 1, b: "hum" },
      })
      .on(e);
  });

  await t.should("work with secret", async () => {
    await gql`
      query {
        withSecret(first: 1) {
          a
          b
        }
      }
    `
      .expectData({
        withSecret: { a: 1, b: "supersecret" },
      })
      .on(e);
  });

  await t.should("work with from_parent injection", async () => {
    await gql`
      query {
        withParent {
          a
          b(b1: 2) { b1 b2 }
        }
      }
    `
      .expectData({
        withParent: { a: 1, b: { b1: 2, b2: 1 } },
      })
      .on(e);
  });

  await t.should("work with list", async () => {
    await gql`
      query {
        withArray(first: 1, second: 2) {
          a
        }
      }
    `
      .expectData({
        withArray: { a: [1, 2] },
      })
      .on(e);
  });
});
