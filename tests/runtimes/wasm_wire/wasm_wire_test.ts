// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { gql, Meta } from "test-utils/mod.ts";
import { assert, assertEquals } from "@std/assert";
import type { MetaTest } from "../../utils/test.ts";

Meta.test(
  {
    name: "Wasm runtime: wire",
  },
  async (metaTest: MetaTest) => {
    await metaTest.shell(["bash", "build.sh"], {
      currentDir: `${import.meta.dirname!}/rust`,
    });

    {
      const e = await metaTest.engine("runtimes/wasm_wire/wasm_wire.py");

      await metaTest.should("works", async () => {
        await gql`
          query {
            test(a: 1, b: 2)
          }
        `
          .expectData({
            test: 3,
          })
          .on(e);
      });
    }

    await metaTest.should("work after deploying artifact", async (t) => {
      await using engine = await metaTest.engine(
        "runtimes/wasm_wire/wasm_wire.ts",
      );

      await t.step("wit bindings", async () => {
        await gql`
          query {
            add(a: 11, b: 2)
            range(a: 1, b: 4)
          }
        `
          .expectData({
            add: 13,
            range: [1, 2, 3, 4],
          })
          .on(engine);
      });

      await t.step("wit error should propagate gracefully", async () => {
        await gql`
          query {
            range(a: 100, b: 1)
          }
        `
          .expectErrorContains("invalid range: 100 > 1")
          .on(engine);
      });

      await t.step(
        "nested wit output value should deserialize properly",
        async () => {
          await gql`
            query {
              record {
                name
                age
                profile {
                  level
                  attributes
                  category {
                    tag
                    value
                  }
                  metadatas
                }
              }
            }
          `
            .expectData({
              record: [
                {
                  name: "Entity A",
                  age: null,
                  profile: {
                    attributes: ["defend"],
                    level: "bronze",
                    category: { tag: "a", value: null },
                    metadatas: [["strength", 3.14]],
                  },
                },
                {
                  name: "Entity B",
                  age: 11,
                  profile: {
                    attributes: ["attack", "defend", "cast"],
                    level: "gold",
                    category: { tag: "b", value: "bbb" },
                    metadatas: [],
                  },
                },
              ],
            })
            .on(engine);
        },
      );

      await t.step("support nested wit input", async () => {
        await gql`
          query {
            identity(
              name: "Monster A"
              age: null
              profile: {
                attributes: ["attack", "defend"]
                level: "gold"
                # category: { tag: "a", value: "unexpected" }, # fail!
                category: { tag: "b", value: "payload" }
                metadatas: [["a", 1.0], ["b", 1.3]] # list<tuple<string, f64>>
              }
            ) {
              name
              age
              profile {
                level
                attributes
                category {
                  tag
                  value
                }
                metadatas
              }
            }
          }
        `
          .expectData({
            identity: {
              name: "Monster A",
              age: null,
              profile: {
                attributes: ["attack", "defend"],
                level: "gold",
                category: { tag: "b", value: "payload" },
                metadatas: [
                  ["a", 1.0],
                  ["b", 1.3],
                ],
              },
            },
          })
          .on(engine);
      });

      await t.step("hostcall works", async () => {
        await gql`
          query {
            hundred {
              name
              age
              profile {
                level
                attributes
                category {
                  tag
                  value
                }
                metadatas
              }
            }
          }
        `
          .expectBody((body) => {
            assert(body.data.hundred);
            assert(Array.isArray(body.data.hundred));
            assertEquals(body.data.hundred.length, 100);
          })
          .on(engine);
      });
    });
  },
);

Meta.test(
  {
    name: "Wasm runtime: wire duplicate artifact reference",
  },
  async (metaTest: MetaTest) => {
    await metaTest.shell(["bash", "build.sh"], {
      currentDir: `${import.meta.dirname!}/rust`,
    });

    await using e = await metaTest.engine(
      "runtimes/wasm_wire/wasm_duplicate.ts",
    );

    await metaTest.should(
      "work after referencing wasm artifact twice",
      async () => {
        await gql`
          query {
            add1(a: 1, b: 2)
            add2(a: 11, b: 2)
          }
        `
          .expectData({
            add1: 3,
            add2: 13,
          })
          .on(e);
      },
    );
  },
);
