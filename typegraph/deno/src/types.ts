import { core } from "../gen/typegraph_core.js";
import type { IntegerConstraints } from "../gen/exports/core.d.ts";
import { NullableOptional } from "./utils/type_utils.ts";

class Tpe {
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
          typeData.props.map(([name, id]) => [name, new Tpe(id)]),
        ),
      });
    }
    throw new Error("Not a struct");
  }

  asTpe(): Tpe {
    return new Tpe(this.id);
  }
}

class Integer extends Tpe implements Readonly<IntegerConstraints> {
  readonly min?: number;
  readonly max?: number;

  constructor(id: number, data: IntegerConstraints) {
    super(id);
    this.min = data.min;
    this.max = data.max;
  }
}

export function integer(data: NullableOptional<IntegerConstraints> = {}) {
  return new Integer(core.integerb(data).id, data);
}

class Struct<P extends { [key: string]: Tpe }> extends Tpe {
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
