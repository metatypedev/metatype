// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoTaskDefArgs } from "./deps.ts";

const tasks: Record<string, DenoTaskDefArgs> = {
  "fetch-deno": {
    inherit: "_ecma",
    desc: "Cache remote deno modules.",
    fn: ($) =>
      $`bash -s`
        .stdinText(
          "deno cache --import-map typegate/import_map.json " +
            [
              "typegate/src/main.ts",
              "typegate/tests/utils/mod.ts",
              // "typegate/tests/utils/*.ts",
              // "typegate/tests/runtimes/wasm_wire/*.ts",
              // "typegate/tests/runtimes/wasm_reflected/*.ts",
              // "typegate/tests/runtimes/python/*.ts",
              // "dev/deps.ts",
              // "dev/utils.ts",
            ].join(" "),
        ),
  },
};
export default tasks;
