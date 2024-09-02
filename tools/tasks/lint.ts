// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { type DenoTaskDefArgs, ports } from "../deps.ts";
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
      await $`bash -c "deno check ${files}"`;
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
