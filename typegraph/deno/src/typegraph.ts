import * as t from "./types.ts";
import { core } from "../gen/typegraph_core.js";

// class Runtime {
// }

// class DenoRuntime extends Runtime {
// }
//
// class Materializer {
// }
//
// class PureFunc extends Materializer {
// }

// const policies = {
//   public(): Func {
//     return new Func(new Struct({}), new Boolean(), new PureFunc());
//   },
// };

class TypeGraph {
  constructor(public name: string) {
    core.initTypegraph({ name });
  }

  expose(exports: { [key: string]: t.Func<Record<string, t.Typedef>> }) {
    // const { defaultPolicy } = exports;
    core.expose(
      Object.entries(exports).map(([name, fn]) => [name, fn.id]),
      [],
    );
  }
}

export function typegraph(name: string, builder: (g: TypeGraph) => void) {
  const g = new TypeGraph(name);
  builder(g);
  console.log(core.finalizeTypegraph());
}
