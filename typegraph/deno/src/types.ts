// @deno-types="../gen/typegraph_core.d.ts"
import { core } from "../gen/typegraph_core.js";
// import type { Core } from "../gen/exports/core.d.ts";
import { TypeBase, TypeInteger } from "../gen/exports/core.d.ts";
import { NullableOptional } from "./utils/type_utils.ts";
import { Materializer } from "./runtimes/deno.ts";

// type StructConstraints = core_types.StructConstraints;

export class Typedef {
  readonly name?: string;

  constructor(public readonly id: number, base: TypeBase) {
    this.name = base.name;
  }

  get repr(): string | null {
    return core.getTypeRepr(this.id);
  }

  // asInteger(): Integer {
  //   if (this instanceof Integer) {
  //     return this;
  //   }
  //
  //   const typeData = core.typeAsInteger(this.id);
  //   if (typeData != null) {
  //     return new Integer(this.id, typeData);
  //   }
  //   throw new Error("Not an integer");
  // }

  // asStruct(): Struct<Record<string, Typedef>> {
  //   if (this instanceof Struct) {
  //     return this;
  //   }
  //
  //   const typeData = core.typeAsStruct(this.id);
  //   if (typeData != null) {
  //     return new Struct(this.id, {
  //       ...typeData,
  //       props: Object.fromEntries(
  //         typeData.props.map(([name, id]) => [name, new Typedef(id as number)]),
  //       ),
  //     });
  //   }
  //   throw new Error("Not a struct");
  // }

  asTypedef(): Typedef {
    return new Typedef(this.id, { name: this.name });
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
  return new Integer(core.integerb(data, base) as number, data, base);
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
      props: Object.entries(props).map(([name, typ]) => [name, typ.id]),
    }, base) as number,
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
    core.funcb({ inp: inp.id, out: out.id, mat: mat.id }) as number,
    inp,
    out,
    mat,
  );
}
