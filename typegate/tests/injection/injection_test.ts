// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, test } from "../utils.ts";
import { assertRejects } from "std/testing/asserts.ts";

test("Missing env var", async (t) => {
  await assertRejects(
    () => t.pythonFile("injection/injection.py"),
    "cannot find env",
  );
});

test("Injected queries", async (t) => {
  const e = await t.pythonFile("injection/injection.py", {
    secrets: { TG_INJECTION_TEST_VAR: "3" },
  });

  await t.should("fail for missing context", async () => {
    await gql`
    query {
      test(a: 1) {
        raw_int
      }
    }
    `
      .expectErrorContains("'userId' was not found in the context")
      .on(e);
  });

  await t.should("inject values", async () => {
    await gql`
      query {
        test(a: 0) {
          a
          raw_int
          raw_str
          secret
          parent {
            a2
          }
          raw_obj {
            in
          }
        }
      }
    `
      .withContext({
        userId: "123",
      })
      .expectData({
        test: {
          a: 0,
          raw_int: 1,
          raw_str: "2",
          secret: 3,
          parent: {
            a2: 0,
          },
          raw_obj: {
            in: -1,
          },
        },
      })
      .on(e);
  });

  await t.should("refuse injected variables", async () => {
    await gql`
      query {
        test(a: 0, raw_int: 1) {
          a
          raw_int
        }
      }
    `
      .expectErrorContains("Unexpected value for injected parameter 'raw_int'")
      .on(e);
  });

  await t.should("inject the right value matching the effect", async () => {
    await gql`
      query {
        effect_none { operation }
      }
    `
      .expectData({
        effect_none: { operation: "read" },
      })
      .on(e);
    await gql`
      mutation {
        effect_create { operation }
        effect_delete { operation }
        effect_update { operation }
        effect_upsert { operation }
      }
    `
      .expectData({
        effect_create: { operation: "insert" },
        effect_delete: { operation: "remove" },
        effect_update: { operation: "modify" },
        effect_upsert: { operation: "read" },
      })
      .on(e);
  });
});
