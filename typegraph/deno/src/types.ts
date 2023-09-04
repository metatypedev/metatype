// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { core } from "./wit.ts";
import {
  PolicyPerEffect,
  TypeArray,
  TypeBase,
  TypeEither,
  TypeFloat,
  TypeInteger,
  TypeOptional,
  TypeString,
  TypeUnion,
} from "../gen/exports/metatype-typegraph-core.d.ts";
import { Materializer } from "./runtimes/mod.ts";
import { mapValues } from "./deps.ts";
import Policy from "./policy.ts";
import {
  serializeInjection,
  serializeRecordValues,
} from "./utils/func_utils.ts";
import { CREATE, DELETE, NONE, UPDATE } from "./effects.ts";
import { InjectionValue } from "./utils/type_utils.ts";

export type PolicySpec = Policy | {
  none: Policy;
  create: Policy;
  update: Policy;
  delete: Policy;
};

export type Simplified<T> = Omit<T, "of">;

export type SimplifiedBase<T> =
  & { config?: Record<string, unknown> }
  & Omit<T, "runtimeConfig">;

export type SimplifiedNumericData<T> =
  & { enumeration?: number[] }
  & Omit<T, "enumeration">;

export class Typedef {
  readonly name?: string;
  readonly runtimeConfig?: Array<[string, string]>;
  policy: Policy[] | null = null;

  constructor(public readonly _id: number, base: TypeBase) {
    this.name = base.name;
    this.runtimeConfig = base.runtimeConfig;
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

  private withInjection(injection: string) {
    const wrapperId = core.withInjection({
      tpe: this._id,
      injection,
    });
    return new Proxy(this, {
      get(target, prop, receiver) {
        return prop === "_id" ? wrapperId : Reflect.get(target, prop, receiver);
      },
    }) as this;
  }

  set(value: InjectionValue<unknown>) {
    return this.withInjection(
      serializeInjection("static", value, (x: unknown) => JSON.stringify(x)),
    );
  }

  inject(value: InjectionValue<string>) {
    return this.withInjection(
      serializeInjection("dynamic", value),
    );
  }

  fromContext(value: InjectionValue<string>) {
    return this.withInjection(
      serializeInjection("context", value),
    );
  }

  fromSecret(value: InjectionValue<string>) {
    return this.withInjection(
      serializeInjection("secret", value),
    );
  }

  fromParent(value: InjectionValue<string>) {
    let correctValue: any = null;
    if (typeof value === "string") {
      correctValue = proxy(value)._id;
    } else {
      const isObject = typeof value === "object" && !Array.isArray(value) &&
        value !== null;
      if (!isObject) {
        throw new Error("type not supported");
      }

      // Note:
      // Symbol changes the behavior of keys, values, entries => props are skipped
      const symbols = [UPDATE, DELETE, CREATE, NONE];
      const noOtherType = Object.keys(value).length == 0;
      const isPerEffect = noOtherType &&
        symbols
          .some((symbol) => (value as any)?.[symbol] !== undefined);

      if (!isPerEffect) {
        throw new Error("object keys should be of type EffectType");
      }

      correctValue = {};
      for (const symbol of symbols) {
        const v = (value as any)?.[symbol];
        if (v === undefined) continue;
        if (typeof v !== "string") {
          throw new Error(
            `value for field ${symbol.toString()} must be a string`,
          );
        }
        correctValue[symbol] = proxy(v)._id;
      }
    }

    return this.withInjection(
      serializeInjection(
        "parent",
        correctValue,
        (x: unknown) => x as number,
      ),
    );
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

export function boolean(base: SimplifiedBase<TypeBase> = {}) {
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Boolean(core.booleanb(completeBase), completeBase);
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
  data: SimplifiedNumericData<TypeInteger> = {},
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeData = {
    ...data,
    enumeration: data.enumeration
      ? new Int32Array(data.enumeration)
      : undefined,
  };
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Integer(
    core.integerb(completeData, completeBase),
    completeData,
    completeBase,
  );
}

class Float extends Typedef implements Readonly<TypeFloat> {
  readonly min?: number;
  readonly max?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;
  readonly enumeration?: Float64Array;

  constructor(_id: number, data: TypeFloat, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.exclusiveMinimum = data.exclusiveMinimum;
    this.exclusiveMaximum = data.exclusiveMaximum;
    this.multipleOf = data.multipleOf;
    this.enumeration = data.enumeration;
  }
}

export function float(
  data: SimplifiedNumericData<TypeFloat> = {},
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeData = {
    ...data,
    enumeration: data.enumeration
      ? new Float64Array(data.enumeration)
      : undefined,
  };
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Float(
    core.floatb(completeData, completeBase),
    completeData,
    completeBase,
  );
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

export function string(
  data: TypeString = {},
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new StringT(core.stringb(data, completeBase), data, completeBase);
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

export function ean() {
  return string({ format: "ean" });
}

export function path() {
  return string({ format: "path" });
}

export function datetime() {
  return string({ format: "date-time" });
}

// Note: enum is a reserved word
export function enum_(variants: string[], base: SimplifiedBase<TypeBase> = {}) {
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
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeData = {
    of: variant._id,
    ...data,
  } as TypeArray;
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new ArrayT(
    core.arrayb(completeData, completeBase),
    completeData,
    completeBase,
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
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeData = {
    of: variant._id,
    ...data,
  } as TypeOptional;
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Optional(
    core.optionalb(completeData, completeBase),
    completeData,
    completeBase,
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
  base: SimplifiedBase<TypeBase> = {},
) {
  const data = {
    variants: new Uint32Array(variants.map((variant) => variant._id)),
  };
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Union(
    core.unionb(data, completeBase),
    data,
    completeBase,
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
  base: SimplifiedBase<TypeBase> = {},
) {
  const data = {
    variants: new Uint32Array(variants.map((variant) => variant._id)),
  };
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Either(
    core.eitherb(data, completeBase),
    data,
    completeBase,
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
  base: SimplifiedBase<TypeBase> = {},
): Struct<P> {
  const completeBase = {
    ...base,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Struct(
    core.structb({
      props: Object.entries(props).map(([name, typ]) => [name, typ._id]),
    }, completeBase),
    {
      props,
    },
    completeBase,
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
