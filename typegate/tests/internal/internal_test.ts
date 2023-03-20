// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Internal test", async (t) => {
  const port = 7895;
  const e = await t.pythonFile("internal/internal.py", { ports: [port] });

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
