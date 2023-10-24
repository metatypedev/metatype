// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql } from "@test-utils/mod.ts";
import { Meta } from "@test-utils/mod.ts";
import { TestModule } from "@test-utils/test_module.ts";

const m = new TestModule(import.meta);

const port = 7895;

async function selectVersion(version: number) {
  await m.shell([
    "bash",
    "select.sh",
    "templates/migration_failure.py",
    `${version}`,
    "migration_failure.py",
  ]);
}

async function deploy() {
  await m.cli("deploy", "-t", "deploy", "-f", "migration_failure.py");
}

Meta.test("meta deploy: migration failure", async (t) => {
  await t.should("load first version of the typegraph", async () => {
    await selectVersion(1);
    await deploy();
  });
}, { port });
