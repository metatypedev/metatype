// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { dropSchema } from "test-utils/database.ts";

const m = new TestModule(import.meta);

Meta.test("meta undeploy", async (t) => {
  // prepare
  await dropSchema("e2e7895alt");

  // TODO assert this leaks resources
  // await t.should("fail", async () => {
  //   const _out = await m.cli(
  //     {},
  //     "deploy",
  //     "--target",
  //     "dev7895",
  //     "-f",
  //     "templates/migration.py",
  //     "--allow-dirty",
  //   );
  // });

  await t.should("free resources", async () => {
    const _out = await m.cli(
      {},
      "deploy",
      "--target",
      "dev7895",
      "-f",
      "templates/migration.py",
      "--allow-dirty",
    );

    const out2 = await m.cli(
      {},
      "undeploy",
      "--target",
      "dev7895",
      "--typegraph",
      "migration-failure-test",
    );

    console.log(out2.stderr);
  });
}, { port: 7895, systemTypegraphs: true });
