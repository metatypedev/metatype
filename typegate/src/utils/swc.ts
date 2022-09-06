import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";
import type { Config } from "https://esm.sh/@swc/core@1.2.212/types.d.ts";
import type { TypeGraphDS } from "../typegraph.ts";

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
      // case "function":
      //   mat.data.fn_expr =
      //     transform(mat.data.fn_expr as string, swcConfig).code;
      //   break;

      case "module":
        mat.data.code = transform(mat.data.code as string, swcConfig).code;
        break;
    }
  }
}
