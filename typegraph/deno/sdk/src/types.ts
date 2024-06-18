// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { core, wit_utils } from "./wit.js";
import {
  ParameterTransform,
  PolicyPerEffect,
  PolicySpec as WitPolicySpec,
  TypeBase,
  TypeEither,
  TypeFile,
  TypeFloat,
  TypeInteger,
  TypeList,
  TypeOptional,
  TypeString,
  TypeUnion,
} from "./gen/interfaces/metatype-typegraph-core.js";
import { Reduce } from "./gen/interfaces/metatype-typegraph-utils.js";
import { FuncParams } from "./gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer } from "./runtimes/mod.js";
import { mapValues } from "./deps/mod.js";
import Policy, { PolicyPerEffectObject } from "./policy.js";
import { buildReduceData, serializeRecordValues } from "./utils/func_utils.js";
import {
  serializeFromParentInjection,
  serializeGenericInjection,
  serializeStaticInjection,
} from "./utils/injection_utils.js";
import { InjectionValue } from "./utils/type_utils.js";
import {
  ApplyFromArg,
  ApplyFromContext,
  ApplyFromParent,
  ApplyFromSecret,
  ApplyFromStatic,
  InheritDef,
} from "./typegraph.js";

export type PolicySpec = Policy | PolicyPerEffectObject | {
  none: Policy;
  create: Policy;
  update: Policy;
  delete: Policy;
};

export type Simplified<T> = Omit<T, "of">;

export type SimplifiedBase<T> =
  & { config?: Record<string, unknown> }
  & Omit<T, "runtimeConfig" | "asId">;

export type AsId = {
  asId?: true;
};

export type SimplifiedNumericData<T> =
  & { enumeration?: number[] }
  & Omit<T, "enumeration">;

export function getPolicyChain(
  policy: PolicySpec[] | PolicySpec,
): WitPolicySpec[] {
  const chain = Array.isArray(policy) ? policy : [policy];
  return chain.map((p) => {
    if (p instanceof Policy) {
      return { tag: "simple", val: p._id } as const;
    }

    return {
      tag: "per-effect",
      val: mapValues(
        p instanceof PolicyPerEffectObject ? p.value : p,
        (v: any) => v._id,
      ) as unknown as PolicyPerEffect,
    } as const;
  });
}

export class Typedef {
  readonly name?: string;
  readonly runtimeConfig?: Array<[string, string]>;
  policy: Policy[] | null = null;

  constructor(public readonly _id: number, base: Omit<TypeBase, "asId">) {
    this.name = base.name;
    this.runtimeConfig = base.runtimeConfig;
  }

  get repr(): string | null {
    return core.getTypeRepr(this._id);
  }

  withPolicy(policy: PolicySpec[] | PolicySpec): this {
    const id = core.withPolicy(this._id, getPolicyChain(policy));

    const chain = Array.isArray(policy) ? policy : [policy];
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

  rename(name: string): this {
    const id = core.renameType(this._id, name);

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === "_id") {
          return id;
        } else if (prop === "name") {
          return name;
        } else {
          return Reflect.get(target, prop, receiver);
        }
      },
    });
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

  withInjection(injection: string) {
    const wrapperId = core.withInjection(this._id, injection);
    return new Proxy(this, {
      get(target, prop, receiver) {
        switch (prop) {
          case "_id":
            return wrapperId;
          case "injection":
            return injection;
          default:
            return Reflect.get(target, prop, receiver);
        }
      },
    }) as this;
  }

  set(value: InjectionValue<unknown>) {
    return this.withInjection(
      serializeStaticInjection(value),
    );
  }

  inject(value: InjectionValue<string>) {
    return this.withInjection(
      serializeGenericInjection("dynamic", value),
    );
  }

  fromContext(value: InjectionValue<string>) {
    return this.withInjection(
      serializeGenericInjection("context", value),
    );
  }

  fromSecret(value: InjectionValue<string>) {
    return this.withInjection(
      serializeGenericInjection("secret", value),
    );
  }

  fromParent(value: InjectionValue<string>) {
    return this.withInjection(
      serializeFromParentInjection(value),
    );
  }

  fromRandom() {
    return this.withInjection(
      serializeGenericInjection("random", null),
    );
  }
}

class Boolean extends Typedef {
  constructor(_id: number, base: TypeBase) {
    super(_id, base);
  }
}

export function boolean(base: SimplifiedBase<TypeBase> = {}) {
  const completeBase = {
    ...base,
    asId: false,
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
  base: SimplifiedBase<TypeBase> & AsId = {},
) {
  const completeData = {
    ...data,
    enumeration: data.enumeration
      ? new Int32Array(data.enumeration)
      : undefined,
  };
  const completeBase = {
    ...base,
    asId: base.asId ?? false,
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
    asId: false,
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
  base: SimplifiedBase<TypeBase> & AsId = {},
) {
  const completeBase = {
    ...base,
    asId: base.asId ?? false,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new StringT(core.stringb(data, completeBase), data, completeBase);
}

export function uuid(base: SimplifiedBase<TypeBase> & AsId = {}) {
  return string({ format: "uuid" }, base);
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

export function json() {
  return string({ format: "json" });
}

export function hostname() {
  return string({ format: "hostname" });
}

export function phone() {
  return string({ format: "phone" });
}

// Note: enum is a reserved word
export function enum_(variants: string[], base: SimplifiedBase<TypeBase> = {}) {
  return string({
    enumeration: variants.map((variant) => JSON.stringify(variant)),
  }, base);
}

class File extends Typedef {
  readonly min?: number;
  readonly max?: number;
  readonly allow?: string[];

  constructor(_id: number, data: TypeFile, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.allow = data.allow;
  }
}

export function file(
  data: Simplified<TypeFile> = {},
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeBase = {
    ...base,
    asId: false,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new File(core.fileb(data, completeBase), data, completeBase);
}

class List extends Typedef {
  readonly min?: number;
  readonly max?: number;
  readonly items?: number;
  readonly uniqueItems?: boolean;

  constructor(_id: number, data: TypeList, base: TypeBase) {
    super(_id, base);
    this.min = data.min;
    this.max = data.max;
    this.items = data.of;
    this.uniqueItems = data.uniqueItems;
  }
}

export function list(
  variant: Typedef,
  data: Simplified<TypeList> = {},
  base: SimplifiedBase<TypeBase> = {},
) {
  const completeData = {
    of: variant._id,
    ...data,
  } as TypeList;
  const completeBase = {
    ...base,
    asId: false,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new List(
    core.listb(completeData, completeBase),
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
    defaultItem: JSON.stringify(data.defaultItem),
  } as TypeOptional;
  const completeBase = {
    ...base,
    asId: false,
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
    asId: false,
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
    asId: false,
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
  base: SimplifiedBase<TypeBase> & { additionalProps?: boolean } = {},
): Struct<P> {
  const completeBase = {
    ...base,
    asId: false,
    runtimeConfig: base.config && serializeRecordValues(base.config),
  };
  return new Struct(
    core.structb({
      props: Object.entries(props).map(([name, typ]) => [name, typ._id]),
      additionalProps: completeBase.additionalProps ?? false,
    }, completeBase),
    {
      props,
    },
    completeBase,
  );
}

// `Record<string, ApplyParamNode>` does work...
type ApplyParamObjectNode = {
  [key: string]: ApplyParamNode;
};
type ApplyParamArrayNode = Array<ApplyParamNode>;
type ApplyParamLeafNode =
  | ApplyFromArg
  | ApplyFromStatic
  | ApplyFromContext
  | ApplyFromSecret
  | ApplyFromParent;
type ApplyParamNode =
  | ApplyParamObjectNode
  | ApplyParamArrayNode
  | ApplyParamLeafNode;

function serializeApplyParamNode(
  node: ApplyParamNode,
): Record<string, unknown> {
  if (node instanceof ApplyFromArg) {
    return { source: "arg", name: node.name, typeId: node.type };
  } else if (node instanceof ApplyFromStatic) {
    return { source: "static", value: JSON.stringify(node.value) };
  } else if (node instanceof ApplyFromContext) {
    return { source: "context", key: node.key, typeId: node.type };
  } else if (node instanceof ApplyFromSecret) {
    return { source: "secret", key: node.key };
  } else if (node instanceof ApplyFromParent) {
    return { source: "parent", typeName: node.typeName };
  } else if (Array.isArray(node)) {
    return {
      type: "array",
      items: node.map(serializeApplyParamNode),
    };
  } else if (typeof node === "object" && node !== null) {
    return {
      type: "object",
      fields: mapValues(node, serializeApplyParamNode),
    };
  }
  throw new Error(`Unexpected node type: ${node}`);
}

export class Func<
  I extends Typedef = Typedef,
  O extends Typedef = Typedef,
  M extends Materializer = Materializer,
> extends Typedef {
  inp: I;
  out: O;
  mat: M;
  parameterTransform: ParameterTransform | null;
  config: FuncConfig | null;

  constructor(
    _id: number,
    inp: I,
    out: O,
    mat: M,
    parameterTransform: ParameterTransform | null = null,
    config: FuncConfig | null = null,
  ) {
    super(_id, {});
    this.inp = inp;
    this.out = out;
    this.mat = mat;
    this.parameterTransform = parameterTransform;
    this.config = config;
  }

  extend(fields: Record<string, Typedef>): Func<I, Typedef, M> {
    const output = core.extendStruct(
      this.out._id,
      Object.entries(fields).map(([name, typ]) =>
        [name, typ._id] as [string, number]
      ),
    );

    return func(
      this.inp,
      new Typedef(output, {}),
      this.mat,
      this.parameterTransform,
      this.config,
    );
  }

  reduce(value: Record<string, unknown | InheritDef>) {
    const data: Reduce = {
      paths: buildReduceData(value),
    };

    const reducedId = wit_utils.genReduceb(
      this.inp._id,
      data,
    );

    return func(
      new Typedef(reducedId, {}),
      this.out,
      this.mat,
    );
  }

  apply(value: ApplyParamObjectNode): Func<Typedef, O, M> {
    const serialized = serializeApplyParamNode(value);
    if (
      typeof serialized !== "object" || serialized == null ||
      serialized.type !== "object"
    ) {
      throw new Error("Invalid apply value: root must be an object");
    }
    const transformTree = JSON.stringify(serialized.fields);
    const transformData = core.getTransformData(this.inp._id, transformTree);

    return func(
      new Typedef(transformData.queryInput, {}),
      this.out,
      this.mat,
      transformData.parameterTransform,
      this.config,
    );
  }

  rate(
    inp: { calls: boolean; weight?: number },
  ): Func<I, O, M> {
    return func(
      this.inp,
      this.out,
      this.mat,
      this.parameterTransform,
      { rateCalls: inp.calls ?? false, rateWeight: inp.weight },
    );
  }

  static fromTypeFunc(data: FuncParams) {
    return func(
      new Typedef(data.inp, {}) as Struct<{ [key: string]: Typedef }>,
      new Typedef(data.out, {}),
      { _id: data.mat },
    );
  }
}

type FuncConfig = {
  rateCalls?: boolean;
  rateWeight?: number;
};

export function func<
  I extends Typedef = Typedef,
  O extends Typedef = Typedef,
  M extends Materializer = Materializer,
>(
  inp: I,
  out: O,
  mat: M,
  transformData: ParameterTransform | null = null,
  config: FuncConfig | null = null,
) {
  const rateCalls = config?.rateCalls ?? false;
  const rateWeight = config?.rateWeight ?? undefined;
  return new Func<I, O, M>(
    core.funcb({
      inp: inp._id,
      out: out._id,
      mat: mat._id,
      parameterTransform: transformData ?? undefined,
      rateCalls,
      rateWeight,
    }) as number,
    inp,
    out,
    mat,
    transformData,
    config,
  );
}
