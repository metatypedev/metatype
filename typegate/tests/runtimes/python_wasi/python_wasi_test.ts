// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assert, assertEquals } from "std/testing/asserts.ts";
import { gql, Meta } from "../../utils/mod.ts";
import { PythonVirtualMachine } from "../../../src/runtimes/python_wasi/python_vm.ts";

Meta.test("Python WASI VM performance", async (t) => {
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

  await vm.destroy();
});

Meta.test("Python WASI runtime", async (t) => {
  const e = await t.engine("runtimes/python_wasi/python_wasi.py");

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

  await t.should("work once (module)", async () => {
    await gql`
      query {
        testMod(name: "Loyd")
      }
    `
      .expectData({
        testMod: "Hello Loyd",
      })
      .on(e);
  });

  await t.should("return same object", async () => {
    await gql`
      query {
        identity(
          input: {
            a: 1234, 
            b: { c: ["one", "two", "three" ] }
          }
        ) {
          a
          b { c }
        }
      }
    `
      .expectData({
        identity: {
          a: 1234,
          b: { c: ["one", "two", "three"] },
        },
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

    assert(duration < 600, `Python WASI runtime was too slow: ${duration}ms`);
  });
});
