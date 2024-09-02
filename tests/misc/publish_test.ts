// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
import { assert } from "@std/assert/assert";
import { exists } from "@std/fs/exists";
import { Meta } from "test-utils/mod.ts";

Meta.test({ name: "simulate publish on npm and jsr" }, async (t) => {
  await t.should("simulate publish on npm", async () => {
    const output = await t.shell(
      "pnpm publish --dry-run --no-git-check".split(/\s+/),
      {
        currentDir: "src/typegraph/node",
      },
    );
    console.log("code", output.code);
    console.log("stdout", output.stdout);
    console.error("stderr", output.stderr);
  });

  await t.should("simulate publish on jsr", async () => {
    assert(
      await exists("src/typegraph/deno/deno.json"),
      "jsr export map exists",
    );

    // FIXME: rm --allow-slow-types once typing has gone better
    const output = await t.shell(
      "deno publish --dry-run --allow-slow-types --allow-dirty".split(/\s+/),
      {
        currentDir: "src/typegraph/deno",
      },
    );
    console.log("code", output.code);
    console.log("stdout", output.stdout);
    console.error("stderr", output.stderr);
  });
});
