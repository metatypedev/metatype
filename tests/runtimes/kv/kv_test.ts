// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { MetaTest } from "../../utils/test.ts";
import { gql, Meta } from "../../utils/mod.ts";

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

    await t.should("return null when key not found", async () => {
      await gql`
        query {
          get(key: "INEXISTENT")
        }
      `
        .expectData({
          get: null,
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

    await t.should("push and pop values", async () => {
      const key1 = "test:first";
      const key2 = "test:second";
      const theList = ["one", "two", "three"];
      try {
        let i = 1;
        for (const value of theList) {
          await gql`mutation {
            lpush(key: $key1, value: $value)
            rpush(key: $key2, value: $value)
          }`
            .withVars({ key1, key2, value })
            .expectData({
              lpush: i,
              rpush: i,
            })
            .on(e);
          i += 1;
        }
  
        let pos = theList.length - 1;
        for (const _ of theList) {
          await gql`mutation {
            lpop(key: $key1)
            rpop(key: $key2)
          }`
            .withVars({ key1, key2 })
            .expectData({
              lpop: theList.at(pos) ?? null,
              rpop: theList.at(pos) ?? null,
            })
            .on(e);

          pos -= 1;
        }
      } catch(err) {
        throw err;
      } finally {
        await gql`mutation { 
          delete(key: $key1)
          delete(key: $key2)
        }`
          .withVars({ key1, key2 })
          .expectBody((_) => {})
          .on(e);
      }
    });
  },
);
