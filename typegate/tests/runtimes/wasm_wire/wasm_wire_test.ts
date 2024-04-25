// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasm_reflected.ts";
import * as path from "std/path/mod.ts";

const cwd = path.join(testDir, "runtimes/wasm_reflected");
const auth = new BasicAuth("admin", "password");

Meta.test(
  {
    name: "Wasm runtime: reflected",
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    const e = await t.engineFromTgDeployPython(
      path.join(cwd, "wasm_reflected.py"),
      cwd,
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
    name: "Wasm Runtime typescript sdk: reflected",
    port: true,
    systemTypegraphs: true,
  },
  async (metaTest) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    await metaTest.should("work after deploying artifact", async (t) => {
      const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
        baseUrl: gate,
        auth,
        artifactsConfig: {
          prismaMigration: {
            globalAction: {
              create: true,
              reset: false,
            },
            migrationDir: "prisma-migrations",
          },
          dir: cwd,
        },
        typegraphPath: path.join(cwd, "wasm_reflected.ts"),
        secrets: {},
      });

      const engine = await metaTest.engineFromDeployed(serialized);

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
              arg0: {
                name: "Monster A"
                age: null
                profile: {
                  attributes: ["attack", "defend"]
                  level: "gold"
                  # category: { tag: "a", value: "unexpected" }, # fail!
                  category: { tag: "b", value: "payload" }
                  metadatas: [["a", 1.0], ["b", 1.3]] # list<tuple<string, f64>>
                }
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

      await engine.terminate();
    });
  },
);
