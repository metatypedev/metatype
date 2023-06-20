import * as t from "./types.ts";
import { core } from "../gen/typegraph_core.js";

type Exports = Record<string, t.Func>;

export function typegraph(
  name: string,
  define: (expose: (exports: Exports) => void) => void,
) {
  core.initTypegraph({ name });

  define((exports) => {
    core.expose(
      Object.entries(exports).map(([name, fn]) => [name, fn.id]),
      [],
    );
  });

  console.log(core.finalizeTypegraph());
}
