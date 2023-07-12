// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assert } from "std/testing/asserts.ts";
import { gql, test } from "../../utils.ts";
import { PythonVirtualMachine } from "../../../src/runtimes/python_wasi/python_vm.ts";
import { assertEquals } from "https://deno.land/std@0.129.0/testing/asserts.ts";

test("Python WASI VM performance", async (t) => {
  const vm = new PythonVirtualMachine();
  await vm.setup("myVm");

  await t.should("work with low latency for lambdas", async () => {
    await vm.registerLambda("test", "lambda x: x['a']");
    const samples = [...Array(100).keys()].map((i) =>
      vm.applyLambda(i, "test", [{ a: "test" }])
    );
    const start = performance.now();
    const items = await Promise.all(samples);
    const end = performance.now();
    const duration = end - start;

    const randomItem = items[Math.floor(items.length * Math.random())];
    assertEquals(randomItem, "test"); // always resolved
    assert(
      duration < 5,
      `virtual machine execution was too slow: ${duration}ms`,
    );
  });

  await t.should("work with low latency for defs", async () => {
    await vm.registerDef(
      "test",
      "def test(x):\n\treturn x['a']",
    );
    const samples = [...Array(100).keys()].map((i) =>
      vm.applyDef(
        i,
        "test",
        [{ a: "test" }],
      )
    );
    const start = performance.now();
    const items = await Promise.all(samples);
    const end = performance.now();
    const duration = end - start;

    const randomItem = items[Math.floor(items.length * Math.random())];
    assertEquals(randomItem, "test"); // always resolved
    assert(
      duration < 5,
      `virtual machine execution was too slow: ${duration}ms`,
    );
  });
});

test("Python WASI runtime", async (t) => {
  const e = await t.pythonFile("runtimes/python_wasi/python_wasi.py");

  await t.should("work once (lambda)", async () => {
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

  await t.should("work once (def)", async () => {
    await gql`
      query {
        testDef(a: "test")
      }
    `
      .expectData({
        testDef: "test",
      })
      .on(e);
  });

  await t.should("work fast enough", async () => {
    const tests = [...Array(100).keys()].map((i) =>
      gql`
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
        .on(e)
    );

    const start = performance.now();
    await Promise.all(tests);
    const end = performance.now();
    const duration = end - start;
    // from ~100ms (deno <-> wasi) to ~350ms (bindgen <-> wasmedge host <-> wasi)
    // we still have ~0ms on raw tests
    // so we have about ~310ms, ~400ms pure overhead
    assert(duration < 400, `Python WASI runtime was too slow: ${duration}ms`);
  });
});
