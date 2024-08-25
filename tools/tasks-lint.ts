// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoTaskDefArgs, ports } from "./deps.ts";
import installs from "./installs.ts";

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
} satisfies Record<string, DenoTaskDefArgs>;
