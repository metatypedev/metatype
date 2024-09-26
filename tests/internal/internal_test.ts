// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test(
  {
    name: "Internal test",
  },
  async (t) => {
    const e = await t.engine("internal/internal.py");

    await t.should("work on the default worker", async () => {
      await gql`
        query {
          remoteSum(first: 1.2, second: 2.3)
        }
      `
        .expectData({
          remoteSum: 3.5,
        })
        .on(e, `http://localhost:${t.port}`);
    });

    await t.should("hostcall python work", async () => {
      await gql`
        query {
          remoteSub(first: 1.2, second: 2.3)
        }
      `
        .expectData({
          remoteSum: -1.1,
        })
        .on(e, `http://localhost:${t.port}`);
    });
  },
);
