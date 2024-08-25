// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { newTempDir, workspaceDir } from "test-utils/dir.ts";
import { exists, expandGlob } from "@std/fs";
import { join } from "@std/path";
import { assert } from "@std/assert";
import { shell } from "test-utils/shell.ts";

type LangRuntimeConfig<V> = {
  python: V;
  deno: V;
  node: V;
};

const envs = {
  python: {
    RUST_LOG: "trace",
  },
  deno: {
    MCLI_LOADER_CMD:
      "deno run -A --import-map=../../typegate/import_map.json {filepath}",
    RUST_LOG: "trace",
  },
  node: {
    RUST_LOG: "trace",
  },
} as LangRuntimeConfig<Record<string, string>>;

const files = {
  python: "api/example.py",
  deno: "api/example.ts",
  node: "api/example.ts",
} as LangRuntimeConfig<string>;

const install = {
  python: async (_dir: string) => {},
  deno: async (dir: string) => {
    for await (
      const { path } of expandGlob("./**/*.ts", {
        root: dir,
        includeDirs: false,
        globstar: true,
      })
    ) {
      const content = await Deno.readTextFile(path);
      const rewrite = content.replace(
        /"(npm:@typegraph\/sdk@[0-9]+\.[0-9]+\.[0-9]+)(-[0-9]+)?(.+)";/g,
        (_m, _pref, _, mod) => `"@typegraph/sdk${mod}.ts"`,
      );
      await Deno.writeTextFile(path, rewrite);
    }
  },
  node: async (dir: string) => {
    const opt = { currentDir: dir };
    // Remove original package
    await shell("pnpm remove @typegraph/sdk".split(/\s+/), opt);

    // Install tsx, etc.
    await shell("pnpm install".split(/\s+/), opt);

    // Use local node
    const localNodeSdk = join(dir, "../../typegraph/node");
    if (!(await exists(localNodeSdk))) {
      throw new Error(`Node sdk not found at ${localNodeSdk}`);
    }
    // await shell(`deno run -A typegraph/deno/dev/deno2node.ts`.split(/\s+/));
    await shell(`pnpm install ${localNodeSdk}`.split(/\s+/), opt);
  },
} as LangRuntimeConfig<(dir: string) => Promise<void>>;

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
        {
          currentDir: dir,
          env: envs[template],
        },
        "deploy",
        "--target",
        "dev",
        "--gate",
        `http://localhost:${t.port}`,
        "--allow-dirty",
        "-f",
        files[template],
      );
      console.log(out);
    },
  );
}
