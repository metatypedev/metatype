// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { copyLock, DenoTaskDefArgs, parseArgs, sedLock } from "./deps.ts";
import * as consts from "./consts.ts";

const tasks: Record<string, DenoTaskDefArgs> = {
  "lock-sed": {
    desc: "Update versions",
    fn: async ($) => {
      const args = parseArgs(Deno.args, {
        boolean: ["check"],
        default: { version: false, check: false },
      });

      const ignores = [
        "dev/tasks-lock.ts",
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
        "dev/LICENSE-MPL-2.0.md": [
          "typegraph/python/LICENSE.md",
          "typegraph/deno/LICENSE.md",
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
        await $`cargo verify-project`.stdout("piped");
      }
    },
  },
};
export default tasks;
