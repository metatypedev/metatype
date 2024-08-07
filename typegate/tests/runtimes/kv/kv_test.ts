// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { MetaTest } from "test-utils/test.ts";
import { gql, Meta } from "test-utils/mod.ts";

async function testSerialize(t: MetaTest, file: string) {
  await t.should(`serialize typegraph ${file}`, async () => {
    const { stdout: tg } = await Meta.cli("serialize", "--pretty", "-f", file);
    await t.assertSnapshot(tg);
  });
}

Meta.test({ name: "Typegraph using kv" }, async (t) => {
  await testSerialize(t, "runtimes/kv/kv.ts");
  await testSerialize(t, "runtimes/kv/kv.py");
});

Meta.test(
  {
    name: "Kv runtime",
  },
  async (t) => {
    const e = await t.engine("runtimes/kv/kv.ts", {
      secrets: {
        REDIS: "redis://:password@localhost:6379",
      },
    });

    await t.should("set key to value", async () => {
      await gql`
        mutation {
          set(key: "name", value: "joe")
        }
      `
        .expectData({
          set: "OK",
        })
        .on(e);
    });

    await t.should("get value from redis by key", async () => {
      await gql`
        query {
          get(key: "name")
        }
      `
        .expectData({
          get: "joe",
        })
        .on(e);
    });

    await t.should("get all keys from redis", async () => {
      await gql`
        query {
          keys(filter: "*")
        }
      `
        .expectData({
          keys: ["name"],
        })
        .on(e);
    });

    await t.should("get values from redis", async () => {
      await gql`
        query {
          values(filter: "*")
        }
      `
        .expectData({
          values: ["joe"],
        })
        .on(e);
    });

    await t.should("delete key", async () => {
      await gql`
        mutation {
          delete(key: "name")
        }
      `
        .expectData({
          delete: 1,
        })
        .on(e);
    });
  },
);
