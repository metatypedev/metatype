// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "test-utils/dir.ts";
import { gql, Meta } from "../utils/mod.ts";
import * as path from "std/path/mod.ts";

const cwd = path.join(testDir, "internal");

Meta.test({
  name: "Internal test",
  port: true,
  systemTypegraphs: true,
}, async (t) => {
  const e = await t.engineFromTgDeployPython("internal/internal.py", cwd);

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
});
