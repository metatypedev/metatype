// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { newTempDir, workspaceDir } from "test-utils/dir.ts";
import { exists, expandGlob } from "std/fs/mod.ts";
import { join } from "std/path/mod.ts";
import { assert } from "std/assert/mod.ts";
import { shell } from "test-utils/shell.ts";

const install = {
  python: async (_dir: string) => {},
  deno: async (_dir: string) => {},
  node: async (dir: string) => {
    await shell(["pnpm", "install"], { currentDir: dir });
  },
} as const;

for (const template of ["python", "deno", "node"] as const) {
  Meta.test(
    {
      name: `${template} template`,
    },
    async (t) => {
      const dir = await newTempDir();

      await t.should("should be extracted correctly", async () => {
        const out = await Meta.cli("new", "--template", template, dir);
        console.log(out.stdout);
        const source = join(workspaceDir, "examples/templates", template);
        const sourcesFiles = await Array.fromAsync(
          expandGlob("**/*", {
            root: source,
          }),
        );
        assert(sourcesFiles.length > 0);
        for (const f of sourcesFiles) {
          const relPath = f.path.replace(source, "");
          assert(exists(join(dir, relPath)));
        }
      });

      await install[template](dir);
      // await modifiers[template](dir);
      const out = await Meta.cli(
        { currentDir: dir },
        "deploy",
        "--target",
        "dev",
        "--gate",
        `http://localhost:${t.port}`,
        "--allow-dirty",
      );
      console.log(out);
    },
  );
}
