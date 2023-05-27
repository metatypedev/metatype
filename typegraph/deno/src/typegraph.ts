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

  expose(exports: { [key: string]: t.Func }) {
    // const { defaultPolicy } = exports;
    core.expose(
      Object.entries(exports).map(([name, fn]) => [name, t.ref(fn)]),
      [],
    );
  }
}

const a = t.integer();
const b = t.integer({ min: 12n });
const c = t.integer({ min: 12n, max: 43n });
console.log(a.repr);
console.log(b.repr);
console.log(c.repr);

const s1 = t.struct({ a, b: t.integer() });
console.log(s1.repr);

const f = t.func(s1, a);
console.log(f.repr);

function typegraph(name: string, builder: (g: TypeGraph) => void) {
  const g = new TypeGraph(name);
  builder(g);
  console.log(core.finalizeTypegraph());
}

typegraph("name", (g) => {
  // const pub = policies.public();

  // g.expose({
  //   a: new Func(new Struct({}), new Struct({}), new PureFunc()),
  //   defaultPolicy: pub,
  // });

  g.expose({
    one: t.func(s1, a),
  });
});
