import { core } from "../gen/typegraph_core.js";
import * as core_types from "../gen/exports/core.d.ts";
import { NullableOptional } from "./utils/type_utils.ts";

type IntegerConstraints = NullableOptional<core_types.IntegerConstraints>;
// type StructConstraints = core_types.StructConstraints;

export class Tpe {
  constructor(public id: number) {}

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

  asStruct(): Struct<Record<string, Tpe>> {
    if (this instanceof Struct) {
      return this;
    }

    const typeData = core.typeAsStruct(this.id);
    if (typeData != null) {
      return new Struct(this.id, {
        ...typeData,
        props: Object.fromEntries(
          typeData.props.map(([name, id]) => [name, new Tpe(id as number)]),
        ),
      });
    }
    throw new Error("Not a struct");
  }

  asTpe(): Tpe {
    return new Tpe(this.id);
  }
}

export class Integer extends Tpe implements Readonly<IntegerConstraints> {
  readonly min?: bigint | null;
  readonly max?: bigint | null;

  constructor(id: number, data: IntegerConstraints) {
    super(id);
    this.min = data.min;
    this.max = data.max;
  }
}

export function integer(data: IntegerConstraints = {}) {
  return new Integer(core.integerb(data).id, data);
}

export class Struct<P extends { [key: string]: Tpe }> extends Tpe {
  props: P;
  constructor(id: number, { props }: { props: P }) {
    super(id);
    this.props = props;
  }
}

export function struct<P extends { [key: string]: Tpe }>(props: P): Struct<P> {
  return new Struct(
    core.structb({
      props: Object.entries(props).map(([name, typ]) => [name, typ.id]),
    }).id,
    {
      props,
    },
  );
}

export class Func<
  P extends { [key: string]: Tpe },
  I extends Struct<P>,
  O extends Tpe,
> extends Tpe {
  inp: I;
  out: O;

  constructor(id: number, inp: I, out: O) {
    super(id);
    this.inp = inp;
    this.out = out;
  }
}

export function func<
  P extends { [key: string]: Tpe },
  I extends Struct<P>,
  O extends Tpe,
>(inp: I, out: O) {
  return new Func(
    (core.funcb({ inp: inp.id, out: out.id }) as { id: number }).id,
    inp,
    out,
  );
}
