// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { DENO_VERSION, PYTHON_VERSION, RUST_VERSION } from "./consts.ts";
import * as ports from "@ghjk/ports_wip";

export default {
  python: ports.cpy_bs({ version: PYTHON_VERSION, releaseTag: "20240814" }),
  // for use by pipi based ports
  python_latest: ports.cpy_bs({ version: "3.12.5", releaseTag: "20240814" }),
  node: ports.node({ version: "20.8.0" }),
  rustup: ports.rustup({ version: "1.28.2" }),
  rust_stable: ports.rust({
    version: RUST_VERSION,
    profile: "default",
    components: ["rust-src"],
    // FIXME: targets support is broken
    // targets: ["wasm32-unknown-unknown", "wasm32-wasip1"],
  }),
  rust_nightly: ports.rust({ version: "nightly-2024-05-26" }),
  deno: ports.deno_ghrel({ version: DENO_VERSION }),
  // deno: ports.deno_ghrel({ version: "1.45.2" }),
};
