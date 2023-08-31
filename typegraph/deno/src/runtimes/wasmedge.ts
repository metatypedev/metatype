// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";
import { Materializer, Runtime } from "./mod.ts";

interface WasiMat extends Materializer {
  module: string;
  funcMame: string;
  effect: Effect;
}

export class WasmEdgeRuntime extends Runtime {
  constructor() {
    super(runtimes.registerWasmedgeRuntime());
  }

  wasi<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { func, wasm, effect = { tag: "none" } }: {
      func: string;
      wasm: string;
      effect?: Effect;
    },
  ): t.Func<P, I, O, WasiMat> {
    const matId = runtimes.fromWasiModule(
      {
        runtime: this._id,
        effect,
      },
      {
        module: `file:${wasm}`,
        funcName: func,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      effect,
      module: wasm,
      funcMame: func,
    });
  }
}
