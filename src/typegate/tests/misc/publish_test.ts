// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
import { assert } from "std/assert/assert.ts";
import { exists } from "std/fs/exists.ts";
import { Meta } from "test-utils/mod.ts";

Meta.test({ name: "simulate publish on npm and jsr" }, async (t) => {
  await t.should("simulate publish on npm", async () => {
    const output = await t.shell(
      "pnpm publish --dry-run --no-git-check".split(/\s+/),
      {
        currentDir: "typegraph/node",
      },
    );
    console.log("code", output.code);
    console.log("stdout", output.stdout);
    console.error("stderr", output.stderr);
  });

  await t.should("simulate publish on jsr", async () => {
    assert(
      await exists("typegraph/deno/sdk/jsr.json"),
      "jsr export map exists",
    );

    // FIXME: rm --allow-slow-types once typing has gone better
    const output = await t.shell(
      "deno publish --dry-run --allow-slow-types --allow-dirty".split(/\s+/),
      {
        currentDir: "typegraph/deno/sdk",
      },
    );
    console.log("code", output.code);
    console.log("stdout", output.stdout);
    console.error("stderr", output.stderr);
  });
});
