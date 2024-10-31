// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { copyLock, type DenoTaskDefArgs, parseArgs, sedLock } from "../deps.ts";
import * as consts from "../consts.ts";

export default {
  "lock-sed": {
    desc: "Update versions",
    fn: async ($) => {
      const args = parseArgs(Deno.args, {
        boolean: ["check"],
        default: { version: false, check: false },
      });

      const ignores = [
        "tools/tasks-lock.ts",
        ...(await $.workingDir.resolve(".gitignore").readText())
          .split("\n")
          .map((l) => l.trim())
          .filter((line) => line.length > 0)
          .map((l) => `${l}${l.endsWith("*") ? "" : "*"}`),
        `**/node_modules/**/Cargo.toml`,
      ];

      let dirty = await sedLock($.workingDir, {
        lines: consts.sedLockLines,
        ignores,
      });
      dirty = (await copyLock($.workingDir, {
        "tools/LICENSE-MPL-2.0.md": [
          "src/typegraph/python/LICENSE.md",
          "src/typegraph/deno/LICENSE.md",
        ],
      })) || dirty;

      if (args.check && dirty) {
        throw new Error("dirty on check");
      }

      if (dirty) {
        // have cargo generate lockfile
        // we don't use the `generate-lockfile` command because
        // "If the lockfile already exists, it will be rebuilt with the
        // latest available version of every package."
        // and this breaks stuff
        await $`cargo tree`.stdout("piped");
      }
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
