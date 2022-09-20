// Copyright Metatype under the Elastic License 2.0.

import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";
import type { Config } from "https://esm.sh/@swc/core@1.2.212/types.d.ts";
import type { TypeGraphDS } from "../typegraph.ts";
import { ensure } from "../utils.ts";

const swcConfig: Config = {
  jsc: {
    target: "es2019",
    parser: {
      syntax: "typescript",
    },
  },
};

export function compileCodes(tg: TypeGraphDS) {
  for (const mat of tg.materializers) {
    const runtime = tg.runtimes[mat.runtime];
    if (runtime.name !== "deno" && runtime.name !== "worker") {
      continue;
    }
    switch (mat.name) {
      case "function": {
        const prefix = "const f = ";
        const compiled =
          transform(`${prefix}${mat.data.fn_expr as string};`, swcConfig).code;
        ensure(
          compiled.startsWith(prefix),
          "invalid prefix for compiled function expression",
        );

        mat.data.fn_expr =
          transform(compiled.slice(prefix.length), swcConfig).code;
        break;
      }

      case "module":
        mat.data.code = transform(mat.data.code as string, swcConfig).code;
        break;
    }
  }
}
