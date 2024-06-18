// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DENO_VERSION } from "./consts.ts";
import { ports } from "./deps.ts";

export default {
  python: ports.cpy_bs({ version: "3.8.18", releaseTag: "20240224" }),
  // for use by pipi based ports
  python_latest: ports.cpy_bs({ version: "3.12.2", releaseTag: "20240224" }),
  node: ports.node({ version: "20.8.0" }),
  rust_nightly: ports.rust({ version: "nightly-2024-05-26" }),
  deno: ports.deno_ghrel({ version: DENO_VERSION }),
};
