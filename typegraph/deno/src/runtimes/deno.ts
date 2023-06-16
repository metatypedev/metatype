import * as t from "../types.ts";
// @deno-types="../../gen/typegraph_core.d.ts"
import { runtimes } from "../../gen/typegraph_core.js";
import { Effect } from "../../gen/exports/runtimes.d.ts";

export class Runtime {
  constructor(public readonly id: number) {}
}

export class Materializer {
  constructor(public readonly id: number) {}
}

export class DenoRuntime extends Runtime {
  constructor() {
    super(runtimes.getDenoRuntime());
  }

  func<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { code, secrets = [], effect = { tag: "none" } }: DenoFunc,
  ): t.Func<P, I, O, FunMat> {
    const matId = runtimes.registerDenoFunc({ code, secrets }, effect);
    return t.func(inp, out, new FunMat(matId, code, secrets, effect));
  }

  import<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { name, module, effect = { tag: "none" }, secrets = [] }: DenoImport,
  ): t.Func<P, I, O, ImportMat> {
    const matId = runtimes.importDenoFunction({
      funcName: name,
      module,
      secrets,
    }, effect);
    return t.func(
      inp,
      out,
      new ImportMat(matId, name, module, secrets, effect),
    );
  }
}

export class FunMat extends Materializer {
  constructor(
    id: number,
    private code: string,
    public readonly secrets: Array<string>,
    public readonly effect: Effect,
  ) {
    super(id);
  }
}

export class ImportMat extends Materializer {
  constructor(
    id: number,
    public readonly name: string,
    public readonly module: string,
    public readonly secrets: Array<string>,
    public readonly effect: Effect,
  ) {
    super(id);
  }
}

export interface DenoFunc {
  code: string;
  secrets?: Array<string>;
  effect?: Effect;
}

export interface DenoImport {
  name: string;
  module: string;
  secrets?: Array<string>;
  effect?: Effect;
}
