// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../mod.js";

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
    { func, wasm, effect = fx.read() }: {
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
