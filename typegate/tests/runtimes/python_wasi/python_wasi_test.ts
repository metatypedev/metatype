// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assert } from "std/testing/asserts.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("Python WASI runtime", async (t) => {
  const e = await t.pythonFile("runtimes/python_wasi/python_wasi.py");

  await t.should("work once", async () => {
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

  await t.should("work fast enough", async () => {
    const start = performance.now();
    const tests = [...Array(100).keys()].map((i) =>
      gql`
            query ($a: String!) {
                test(a: $a)
            }
        `.withVars({
        a: `test${i}`,
      })
        .expectData({
          test: `test${i}`,
        })
        .on(e)
    );

    await Promise.all(tests);
    const end = performance.now();
    const duration = end - start;
    assert(duration < 200, `Python WASI runtime was too slow: ${duration}ms`);
  });
});
