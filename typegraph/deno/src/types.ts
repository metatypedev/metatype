import { core } from "../gen/typegraph_core.js";
import * as core_types from "../gen/exports/core.d.ts";
import { NullableOptional } from "./utils/type_utils.ts";

type TypeInteger = NullableOptional<core_types.TypeInteger>;
// type StructConstraints = core_types.StructConstraints;

export class Typedef {
  constructor(public readonly id: number) {}

  get repr(): string | null {
    return core.getTypeRepr(this.id);
  }

  asInteger(): Integer {
    if (this instanceof Integer) {
      return this;
    }

    const typeData = core.typeAsInteger(this.id);
    if (typeData != null) {
      return new Integer(this.id, typeData);
    }
    throw new Error("Not an integer");
  }

  asStruct(): Struct<Record<string, Typedef>> {
    if (this instanceof Struct) {
      return this;
    }

    const typeData = core.typeAsStruct(this.id);
    if (typeData != null) {
      return new Struct(this.id, {
        ...typeData,
        props: Object.fromEntries(
          typeData.props.map(([name, id]) => [name, new Typedef(id as number)]),
        ),
      });
    }
    throw new Error("Not a struct");
  }

  asTypedef(): Typedef {
    return new Typedef(this.id);
  }
}

export class TypeProxy<T extends Typedef = Typedef> extends Typedef {
  constructor(id: number, private readonly name: string) {
    super(id);
  }
}

export function proxy<T extends Typedef = Typedef>(name: string) {
  return new TypeProxy<T>(core.proxyb({ name }), name);
}

export class Integer extends Typedef implements Readonly<TypeInteger> {
  readonly min?: bigint | null;
  readonly max?: bigint | null;

  constructor(id: number, data: TypeInteger) {
    super(id);
    this.min = data.min;
    this.max = data.max;
  }
}

export function integer(data: TypeInteger = {}) {
  return new Integer(core.integerb(data) as number, data);
}

export class Struct<P extends { [key: string]: Typedef }> extends Typedef {
  props: P;
  constructor(id: number, { props }: { props: P }) {
    super(id);
    this.props = props;
  }
}

export function struct<P extends { [key: string]: Typedef }>(
  props: P,
): Struct<P> {
  return new Struct(
    core.structb({
      props: Object.entries(props).map(([name, typ]) => [name, typ.id]),
    }) as number,
    {
      props,
    },
  );
}

export class Func<
  P extends { [key: string]: Typedef },
  I extends Struct<P>,
  O extends Typedef,
> extends Typedef {
  inp: I;
  out: O;

  constructor(id: number, inp: I, out: O) {
    super(id);
    this.inp = inp;
    this.out = out;
  }
}

export function func<
  P extends { [key: string]: Typedef },
  I extends Struct<P>,
  O extends Typedef,
>(inp: I, out: O) {
  return new Func(
    core.funcb({ inp: inp.id, out: out.id }) as number,
    inp,
    out,
  );
}
