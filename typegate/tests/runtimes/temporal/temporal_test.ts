// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { MetaTest } from "test-utils/test.ts";

async function testSerialize(t: MetaTest, file: string) {
  await t.should(`serialize typegraph ${file}`, async () => {
    const { stdout: tg } = await Meta.cli("serialize", "--pretty", "-f", file);
    await t.assertSnapshot(tg);
  });
}

Meta.test("Typegraph using temporal", async (t) => {
  await testSerialize(t, "runtimes/temporal/temporal.py");
  await testSerialize(t, "runtimes/temporal/temporal.ts");
});
