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
  const a1 = t.integer({ min: 12 });
  const b1 = t.integer({ min: 12, max: 43 });

  console.log('"');
  console.log(b);
  console.log(b.min);
  console.log(a1.min);
  console.log(b1);
  console.log(b1.min, b1.max);
  console.log();
  console.log('"');
  console.log(a.repr);
  console.log(a1.asTpe());
  console.log(a1.asTpe().asInteger());

  console.log("----");
  const c = t.struct({ b });

  console.log(t.struct({ b }).props.b);
  console.log(c);
  console.log(c.asTpe());
  const d = c.asTpe().asStruct();
  console.log(c.asTpe().asStruct());
});
