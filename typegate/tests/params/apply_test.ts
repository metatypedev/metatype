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

  await t.should("work with nested arrays", async () => {
    await gql`
      query {
        withNestedArrays(first: 1, second: [2]) {
          a
        }
      }
    `
      .expectData({
        withNestedArrays: { a: [[1], [2]] },
      })
      .on(e);
  });

  await t.should("work with array of objects", async () => {
    await gql`
      query {
        withArrayOfObjects(first: 1, second: { b: 12 }) {
          a { b }
        }
      }
    `
      .expectData({
        withArrayOfObjects: { a: [{ b: 1 }, { b: 12 }] },
      })
      .on(e);
  });

  await t.should("fail for context to union type", async () => {
    await gql`
      query {
        contextToUnionType {
          a
        }
      }
    `
      .withContext({
        context_key: "hum",
      }).expectData({
        contextToUnionType: { a: "hum" },
      }).on(e);
  });
});

Meta.test("nested context access", async (t) => {
  const e = await t.engine("params/apply_nested_context.py");

  await t.should("work with nested context", async () => {
    await gql`
      query {
        simple {
          id
        }
      }
    `
      .withContext({
        profile: { id: 123 },
      })
      .expectData({
        simple: { id: 123 },
      })
      .on(e);
  });

  await t.should("work with custom key", async () => {
    await gql`
      query {
        customKey {
          custom
        }
      }
    `
      .withContext({
        profile: { "custom key": "custom value" },
      })
      .expectData({
        customKey: { custom: "custom value" },
      })
      .on(e);
  });

  await t.should("work with array index", async () => {
    await gql`
      query {
        thirdProfileData {
          third
        }
      }
    `
      .withContext({
        profile: { data: [true, 456, "hum"] },
      })
      .expectData({
        thirdProfileData: { third: "hum" },
      })
      .on(e);
  });

  await t.should("work with deeply nested value", async () => {
    await gql`
      query  {
        deeplyNestedEntry {
          value
        }
      }
    `
      .withContext({
        profile: {
          deeply: [
            { nested: [{ value: "Hello" }, { value: "world" }] },
          ],
        },
      })
      .expectData({
        deeplyNestedEntry: { value: "world" },
      })
      .on(e);
  });

  await t.should("fail for invalid context", async () => {
    await gql`
      query {
        thirdProfileData {
          third
        }
      }
    `
      .withContext({
        profile: { datum: 123 },
      })
      .expectErrorContains("Property 'data' not found at `$.profile`")
      .on(e);
  });

  await t.should("work with invalid context for optional type", async () => {
    await gql`
      query {
        optional {
          optional
        }
      }
    `
      .withContext({
        profile: { datum: 123 },
      })
      .expectData({
        optional: {},
      })
      .on(e);
  });
});
