import { core } from "./wit.ts";
import {
  PolicyPerEffect,
  TypeBase,
  TypeInteger,
} from "../gen/exports/core.d.ts";
import { Materializer } from "./runtimes/deno.ts";
import { mapValues } from "./deps.ts";
import Policy from "./policy.ts";

export type PolicySpec = Policy | {
  none: Policy;
  create: Policy;
  update: Policy;
  delete: Policy;
};

export class Typedef {
  readonly name?: string;
  policy: Policy[] | null = null;

  constructor(public readonly _id: number, base: TypeBase) {
    this.name = base.name;
  }

  get repr(): string | null {
    return core.getTypeRepr(this._id);
  }

  withPolicy(policy: PolicySpec[] | PolicySpec): this {
    const chain = Array.isArray(policy) ? policy : [policy];
    const id = core.withPolicy({
      tpe: this._id,
      chain: chain.map((p) => {
        if (p instanceof Policy) return { tag: "simple", val: p.id } as const;
        return {
          tag: "per-effect",
          val: mapValues(p, (v) => v.id) as unknown as PolicyPerEffect,
        } as const;
      }),
    });

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === "id") {
          return id;
        } else if (prop === "policy") {
          return chain;
        } else {
          return Reflect.get(target, prop, receiver);
        }
      },
    }) as this;
  }

  asTypedef(): Typedef {
    return new Typedef(this._id, { name: this.name });
  }
}

export class TypeProxy<T extends Typedef = Typedef> extends Typedef {
  constructor(id: number, name: string) {
    super(id, { name });
  }
}

export function proxy<T extends Typedef = Typedef>(name: string) {
  return new TypeProxy<T>(core.proxyb({ name }), name);
}

export class Boolean extends Typedef {
  constructor(id: number, base: TypeBase) {
    super(id, base);
  }
}

export function boolean(base: TypeBase = {}) {
  return new Boolean(core.booleanb(base), base);
}

export class Integer extends Typedef implements Readonly<TypeInteger> {
  readonly min?: number;
  readonly max?: number;

  constructor(id: number, data: TypeInteger, base: TypeBase) {
    super(id, base);
    this.min = data.min;
    this.max = data.max;
  }
}

export function integer(data: TypeInteger = {}, base: TypeBase = {}) {
  return new Integer(core.integerb(data, base), data, base);
}

export class Struct<P extends { [key: string]: Typedef }> extends Typedef {
  props: P;
  constructor(id: number, { props }: { props: P }, base: TypeBase) {
    super(id, base);
    this.props = props;
  }
}

export function struct<P extends { [key: string]: Typedef }>(
  props: P,
  base: TypeBase = {},
): Struct<P> {
  return new Struct(
    core.structb({
      props: Object.entries(props).map(([name, typ]) => [name, typ._id]),
    }, base),
    {
      props,
    },
    base,
  );
}

export class Func<
  P extends { [key: string]: Typedef } = Record<string, Typedef>,
  I extends Struct<P> = Struct<P>,
  O extends Typedef = Typedef,
  M extends Materializer = Materializer,
> extends Typedef {
  inp: I;
  out: O;
  mat: M;

  constructor(id: number, inp: I, out: O, mat: M) {
    super(id, {});
    this.inp = inp;
    this.out = out;
    this.mat = mat;
  }
}

export function func<
  P extends { [key: string]: Typedef },
  I extends Struct<P> = Struct<P>,
  O extends Typedef = Typedef,
  M extends Materializer = Materializer,
>(inp: I, out: O, mat: M) {
  return new Func<P, I, O, M>(
    core.funcb({ inp: inp._id, out: out._id, mat: mat.id }) as number,
    inp,
    out,
    mat,
  );
}
