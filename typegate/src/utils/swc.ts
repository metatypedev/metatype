import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";
import type { TypeGraphDS } from "../typegraph.ts";

export function compileCodes(tg: TypeGraphDS) {
  for (const code of tg.codes) {
    code.source = transform(code.source, {
      jsc: {
        target: "es2019",
        parser: {
          syntax: "typescript",
        },
      },
    }).code;
  }
}
