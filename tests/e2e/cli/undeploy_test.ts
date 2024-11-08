// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { dropSchema, randomSchema } from "test-utils/database.ts";

const m = new TestModule(import.meta);

const testCode = "undeploy";
const tgName = `migration-failure-test-${testCode}`;

Meta.test({
  name: "meta undeploy",
}, async (t) => {
  const schema = randomSchema();
  // prepare
  await dropSchema(schema);

  // no leaked resources error
  await t.should("free resources", async () => {
    const target = `migration_${testCode}.py`;
    await m.shell([
      "bash",
      "-c",
      `cat ./templates/migration.py | sed -e "s/migration_failure_test_code/migration_failure_test_${testCode}/" > ${target}`,
    ]);
    await m.cli(
      {},
      "deploy",
      "--target=dev",
      `--gate=http://localhost:${t.port}`,
      "-f",
      target,
      "--allow-dirty",
    );

    await m.cli(
      {},
      "undeploy",
      "--target=dev",
      `--gate=http://localhost:${t.port}`,
      "--typegraph",
      tgName,
    );
  });
});
