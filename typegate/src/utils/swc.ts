// Copyright Metatype under the Elastic License 2.0.

import { transform } from "swc";
import type { Config } from "swc/types";
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
    try {
      switch (mat.name) {
        case "function": {
          const prefix = "const f = ";
          const compiled =
            transform(`${prefix}${mat.data.fn_expr as string};`, swcConfig)
              .code;

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
    } catch (e) {
      throw new Error(
        `materializer ${mat.name} in ${runtime.name} failed compilation: ${e}`,
      );
    }
  }
}
