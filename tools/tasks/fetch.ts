// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { DenoTaskDefArgs } from "../deps.ts";

export default {
  "fetch-deno": {
    inherit: "_ecma",
    desc: "Cache remote deno modules.",
    fn: ($) =>
      $`bash -sx`
        .stdinText(
          "deno cache --config src/typegate/deno.jsonc " +
            [
              "src/typegate/src/main.ts",
              "tests/utils/mod.ts",
              ...($.argv[0] == "full"
                ? [
                  "tests/utils/*.ts",
                  "tests/runtimes/wasm_wire/*.ts",
                  "tests/runtimes/wasm_reflected/*.ts",
                  "tests/runtimes/python/*.ts",
                  "tools/*.ts",
                ]
                : []),
            ].join(" "),
        ),
  },
} satisfies Record<string, DenoTaskDefArgs>;
