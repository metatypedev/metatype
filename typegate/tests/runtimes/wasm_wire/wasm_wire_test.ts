// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
import { gql, Meta } from "test-utils/mod.ts";

Meta.test(
  {
    name: "Wasm runtime: wire",
  },
  async (t: any) => {
    const e = await t.engine(
      "runtimes/wasm_wire/wasm_wire.py",
    );

    await t.should("works", async () => {
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
  },
);

Meta.test(
  {
    name: "Wasm Runtime typescript sdk: wire",
  },
  async (metaTest: any) => {
    await metaTest.should("work after deploying artifact", async (t: any) => {
      const engine = await metaTest.engine(
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
    });
  },
);
