// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { assert } from "std/testing/asserts.ts";
import { gql, test } from "../../utils.ts";

test("Python WASI runtime", async (t) => {
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
    assert((end - start) < 150);
  });
});
