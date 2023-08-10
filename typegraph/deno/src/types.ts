import { core } from "./wit.ts";
import {
  PolicyPerEffect,
  TypeArray,
  TypeBase,
  TypeEither,
  TypeInteger,
  TypeNumber,
  TypeOptional,
  TypeString,
  TypeUnion,
} from "../gen/exports/metatype-typegraph-core.d.ts";
import { Materializer } from "./runtimes/mod.ts";
import { mapValues } from "./deps.ts";
import Policy from "./policy.ts";

export type PolicySpec = Policy | {
  none: Policy;
  create: Policy;
  update: Policy;
  delete: Policy;
};

export type Simplified<T> = Omit<T, "of">;
export type SimplifiedNumeric<T> =
  & { enumeration?: number[] }
  & Omit<T, "enumeration">;

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
        if (p instanceof Policy) return { tag: "simple", val: p._id } as const;
        return {
          tag: "per-effect",
          val: mapValues(p, (v) => v._id) as unknown as PolicyPerEffect,
        } as const;
      }),
    });

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === "_id") {
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

  optional(data: Simplified<TypeOptional> = {}): Optional {
    if (this instanceof Optional) {
      return this;
    }
    return optional(this, data);
  }
}

class TypeProxy<T extends Typedef = Typedef> extends Typedef {
  constructor(_id: number, name: string) {
    super(_id, { name });
  }
}

export function proxy<T extends Typedef = Typedef>(name: string) {
  return new TypeProxy<T>(core.proxyb({ name }), name);
}

export function ref<T extends Typedef = Typedef>(name: string) {
  return proxy<T>(name);
}

class Boolean extends Typedef {
  constructor(_id: number, base: TypeBase) {
    super(_id, base);
  }
}

export function boolean(base: TypeBase = {}) {
  return new Boolean(core.booleanb(base), base);
}

class Integer extends Typedef implements Readonly<TypeInteger> {
  readonly min?: number;
  readonly max?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;
  readonly enumeration?: Int32Array;

  constructor(_id: number, data: TypeInteger, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.exclusiveMinimum = data.exclusiveMinimum;
    this.exclusiveMaximum = data.exclusiveMaximum;
    this.multipleOf = data.multipleOf;
    this.enumeration = data.enumeration;
  }
}

export function integer(
  data: SimplifiedNumeric<TypeInteger> = {},
  base: TypeBase = {},
) {
  const completeData = {
    ...data,
    enumeration: data.enumeration
      ? new Int32Array(data.enumeration)
      : undefined,
  };
  return new Integer(core.integerb(completeData, base), completeData, base);
}

class Number extends Typedef implements Readonly<TypeNumber> {
  readonly min?: number;
  readonly max?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;
  readonly enumeration?: Float64Array;

  constructor(_id: number, data: TypeNumber, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.exclusiveMinimum = data.exclusiveMinimum;
    this.exclusiveMaximum = data.exclusiveMaximum;
    this.multipleOf = data.multipleOf;
    this.enumeration = data.enumeration;
  }
}

export function number(
  data: SimplifiedNumeric<TypeNumber> = {},
  base: TypeBase = {},
) {
  const completeData = {
    ...data,
    enumeration: data.enumeration
      ? new Float64Array(data.enumeration)
      : undefined,
  };
  return new Number(
    core.numberb(completeData, base),
    completeData,
    base,
  );
}

export function float(
  data: SimplifiedNumeric<TypeNumber> = {},
  base: TypeBase = {},
) {
  return number(data, base);
}

class StringT extends Typedef implements Readonly<TypeString> {
  readonly min?: number;
  readonly max?: number;
  readonly format?: string;
  readonly pattern?: string;
  readonly enumeration?: string[];

  constructor(_id: number, data: TypeString, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.pattern = data.pattern;
    this.format = data.format;
    this.enumeration = data.enumeration;
  }
}

export function string(data: TypeString = {}, base: TypeBase = {}) {
  return new StringT(core.stringb(data, base), data, base);
}

export function uuid() {
  return string({ format: "uuid" });
}

export function email() {
  return string({ format: "email" });
}

export function uri() {
  return string({ format: "uri" });
}

export function json(data: { min?: number; max?: number }) {
  return string({ format: "json", ...data });
}

export function ean() {
  return string({ format: "ean" });
}

export function path() {
  return string({ format: "path" });
}

// Note: enum is a reserved word
export function enum_(variants: string[], base: TypeBase = {}) {
  return string({
    enumeration: variants.map((variant) => JSON.stringify(variant)),
  }, base);
}

class ArrayT extends Typedef {
  readonly min?: number;
  readonly max?: number;
  readonly items?: number;
  readonly uniqueItems?: boolean;

  constructor(_id: number, data: TypeArray, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.items = data.of;
    this.uniqueItems = data.uniqueItems;
  }
}

export function array(
  variant: Typedef,
  data: Simplified<TypeArray> = {},
  base: TypeBase = {},
) {
  const completeData = {
    of: variant._id,
    ...data,
  } as TypeArray;
  return new ArrayT(
    core.arrayb(completeData, base),
    completeData,
    base,
  );
}

class Optional extends Typedef {
  readonly item?: number;
  readonly defaultItem?: string;

  constructor(_id: number, data: TypeOptional, base: TypeBase) {
    super(_id, base);
    this.item = data.of;
    this.defaultItem = data.defaultItem;
  }
}

export function optional(
  variant: Typedef,
  data: Simplified<TypeOptional> = {},
  base: TypeBase = {},
) {
  const completeData = {
    of: variant._id,
    ...data,
  } as TypeOptional;
  return new Optional(
    core.optionalb(completeData, base),
    completeData,
    base,
  );
}

class Union extends Typedef {
  readonly variants: Array<number>;

  constructor(_id: number, data: TypeUnion, base: TypeBase) {
    super(_id, base);
    this.variants = Array.from(data.variants);
  }
}

export function union(
  variants: Array<Typedef>,
  base: TypeBase = {},
) {
  const data = {
    variants: new Uint32Array(variants.map((variant) => variant._id)),
  };
  return new Union(
    core.unionb(data, base),
    data,
    base,
  );
}

class Either extends Typedef {
  readonly variants: Array<number>;

  constructor(_id: number, data: TypeEither, base: TypeBase) {
    super(_id, base);
    this.variants = Array.from(data.variants);
  }
}

export function either(
  variants: Array<Typedef>,
  base: TypeBase = {},
) {
  const data = {
    variants: new Uint32Array(variants.map((variant) => variant._id)),
  };
  return new Either(
    core.eitherb(data, base),
    data,
    base,
  );
}

export class Struct<P extends { [key: string]: Typedef }> extends Typedef {
  props: P;
  constructor(_id: number, { props }: { props: P }, base: TypeBase) {
    super(_id, base);
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

  constructor(_id: number, inp: I, out: O, mat: M) {
    super(_id, {});
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
    core.funcb({ inp: inp._id, out: out._id, mat: mat._id }) as number,
    inp,
    out,
    mat,
  );
}
