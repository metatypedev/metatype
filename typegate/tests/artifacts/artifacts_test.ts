// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { join } from "std/path/join.ts";
import { exists } from "std/fs/exists.ts";
import { assert, assertFalse } from "std/assert/mod.ts";

Meta.test({
  name: "Upload protocol",
  port: true,
  systemTypegraphs: true,
}, async (t) => {
  const e = await t.engine("runtimes/deno/deno.py");
  const artifacts = e.tg.tg.meta.artifacts;
  const cacheDir = join(t.tempDir, "artifacts-cache");

  await t.should("have uploaded artifacts on deploy", async () => {
    for (const [_, meta] of Object.entries(artifacts)) {
      assert(await exists(join(cacheDir, meta.hash)));
    }
  });

  await t.undeploy(e.name);

  await t.should("have removed artifacts on undeploy", async () => {
    for (const [_, meta] of Object.entries(artifacts)) {
      assertFalse(await exists(join(cacheDir, meta.hash)));
    }
  });
});

Meta.test({
  name: "Upload protocol: tg_deploy (NodeJs SDK)",
}, async (_t) => {
  // TODO
});

Meta.test({
  name: "Upload protocol: tg_deploy (Python SDK)",
}, async (_t) => {
  // TODO
});

Meta.test({
  name: "Artifact GC: shared artifacts",
}, async (_t) => {
  // TODO
});
