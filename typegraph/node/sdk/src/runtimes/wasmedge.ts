// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../index.js";
import { getFileHash } from "../utils/file_utils.js";

interface WasiMat extends Materializer {
  module: string;
  funcMame: string;
  effect: Effect;
}

export class WasmEdgeRuntime extends Runtime {
  constructor() {
    super(runtimes.registerWasmedgeRuntime());
  }

  async wasi<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { func, wasm, effect = fx.read() }: {
      func: string;
      wasm: string;
      effect?: Effect;
    },
  ): Promise<t.Func<I, O, WasiMat>> {
    let artifactHash = await getFileHash(wasm);

    const matId = runtimes.fromWasiModule(
      {
        runtime: this._id,
        effect,
      },
      {
        module: `file:${wasm}`,
        funcName: func,
        artifactHash: artifactHash,
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
