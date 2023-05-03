import * as t from "./types.ts";

class Type {
}

class Boolean extends Type {
}

class String extends Type {
}

class Struct extends Type {
  constructor(public props: { [key: string]: Type }) {
    super();
  }
}

class Func extends Type {
  constructor(public inp: Type, public out: Type, public mat: Materializer) {
    super();
  }
}

class Runtime {
}

class DenoRuntime extends Runtime {
}

class Materializer {
}

class PureFunc extends Materializer {
}

const policies = {
  public(): Func {
    return new Func(new Struct({}), new Boolean(), new PureFunc());
  },
};

class TypeGraph {
  constructor(public name: string) {}

  expose(exports: { [key: string]: Func; defaultPolicy: Func }) {
    const { defaultPolicy } = exports;
  }
}

function typegraph(name, builder: (g: TypeGraph) => void) {
  const g = new TypeGraph(name);
  builder(g);
}

typegraph("name", (g) => {
  const pub = policies.public();

  g.expose({
    a: new Func(new Struct({}), new Struct({}), new PureFunc()),
    defaultPolicy: pub,
  });

  console.log("====");

  const a = t.integer();
  const b = t.integer();

  console.log('"');
  console.log(b);
  console.log(b._min);
  console.log(b.min(0));
  console.log("a", b.min(0)._min);
  console.log('"');

  console.log("----");
  const c = t.struct({ b });

  console.log(t.struct({ b }).b);
  console.log(c);
});
