// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { transformTypescript, typescript_format_code } from "native";
import { nativeResult } from "./utils.ts";
import { TypeGraphDS } from "./typegraph/mod.ts";

abstract class PostProcessor {
  /** Postprocess the provided typegraph reference */
  abstract postprocess(tg: TypeGraphDS): void;
}

class DenoPostProcess extends PostProcessor {
  postprocess(tg: TypeGraphDS): void {
    for (const mat of tg.materializers) {
      if (mat.name == "function") {
        const jsScript = transformTypescript(mat.data.script as string);
        mat.data.script = nativeResult(
          typescript_format_code({ source: jsScript }),
        )
          ?.formatted_code!;
      }
    }
  }
}

export function applyPostProcessors(typegraphRefs: TypeGraphDS[]): void {
  const postprocesses = [new DenoPostProcess()] as Array<PostProcessor>;
  for (const postprocess of postprocesses) {
    for (const tgJson of typegraphRefs) {
      postprocess.postprocess(tgJson);
    }
  }
}
