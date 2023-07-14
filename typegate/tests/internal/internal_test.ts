// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("Internal test", async (t) => {
  const port = 7895;
  const e = await t.engine("internal/internal.py", { ports: [port] });

  await t.should("work on the default worker", async () => {
    await gql`
      query {
        remoteSum(first: 1.2, second: 2.3)
      }
    `
      .expectData({
        remoteSum: 3.5,
      })
      .on(e, `http://localhost:${port}`);
  });
});
