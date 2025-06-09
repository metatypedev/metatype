// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { DenoTaskDefArgs } from "@ghjk/ts";
import * as ports from "@ghjk/ports_wip"
import installs from "../installs.ts";

export default {
  "lint-udeps": {
    desc: "Check for unused cargo depenencies",
    installs: [
      // udeps needs nightly support
      installs.rust_nightly,
      ports.cargobi({
        crateName: "cargo-udeps",
        version: "0.1.47",
        locked: true,
      }),
    ],
    fn: ($) => $`cargo udeps --all-targets --all-features ${$.argv}`,
  },
  "lint-deno": {
    async fn($) {
      const files = (await $.co(
        [
          Array.fromAsync(
            $.workingDir.join("src/typegraph/deno").expandGlob("**/*.ts", {
              exclude: [],
            }),
          ),
          Array.fromAsync(
            $.workingDir.join("src/typegate/src").expandGlob("**/*.ts", {
              exclude: [],
            }),
          ),
          Array.fromAsync(
            $.workingDir.join("tests").expandGlob("**/*.ts", {
              exclude: [],
            }),
          ),
          Array.fromAsync(
            $.workingDir.join("tools").expandGlob("**/*.ts", {
              exclude: [],
            }),
          ),
        ],
      ))
        .flat()
        .map((ref) => ref.path.toString());
      await $`bash -c "xargs deno check"`.stdinText(files.join(" "));
      await $`bash -c "deno lint"`;
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
