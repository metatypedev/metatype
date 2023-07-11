// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
    for (let i = 1; i <= 100; i += 1) {
      console.time(`sample${i}`);
      await gql`
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
        .on(e);
      console.timeEnd(`sample${i}`);
    }
    const end = performance.now();

    // Note: out of bound memory ? why ?
    // const tests = [...Array(100).keys()].map((i) =>
    //   gql`
    //         query ($a: String!) {
    //             test(a: $a)
    //         }
    //     `.withVars({
    //     a: `test${i}`,
    //   })
    //     .expectData({
    //       test: `test${i}`,
    //     })
    //     .on(e)
    // );

    // await Promise.all(tests);
    // const end = performance.now();
    const duration = end - start;
    // from ~100ms (deno <-> wasi) to ~600ms (bindgen <-> wasmedge host <-> wasi)
    // about ~500ms overhead
    assert(duration < 600, `Python WASI runtime was too slow: ${duration}ms`);
  });
});
