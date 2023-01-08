// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import { assertRejects } from "std/testing/asserts.ts";

test("Missing env var", async (t) => {
  await assertRejects(
    () => t.pythonFile("injection/injection.py"),
    "cannot find env",
  );
});

test("Injected queries", async (t) => {
  Deno.env.set("TG_INJECTION_TEST_VAR", "3");
  const e = await t.pythonFile("injection/injection.py");
  Deno.env.delete("TG_INJECTION_TEST_VAR");

  await t.should("inject values", async () => {
    await gql`
      query {
        test(a: 0) {
          a
          b
          c
          d
          e {
            a2
          }
          f {
            in
          }
        }
      }
    `
      .expectData({
        test: {
          a: 0,
          b: 1,
          c: "2",
          d: 3,
          e: {
            a2: 0,
          },
          f: {
            in: -1,
          },
        },
      })
      .on(e);
  });

  await t.should("refuse injected variables", async () => {
    await gql`
      query {
        test(a: 0, b: 1) {
          a
          b
        }
      }
    `
      .expectErrorContains("cannot set injected arg")
      .on(e);
  });
});
