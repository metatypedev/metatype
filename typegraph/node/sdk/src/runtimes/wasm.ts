// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../index.js";

interface WasmMat extends Materializer {
  module: string;
  funcName: string;
  effect: Effect;
}

export class WasmRuntime extends Runtime {
  constructor() {
    super(runtimes.registerWasmRuntime());
  }

  fromWasm<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    data: {
      func: string;
      wasm: string;
      effect?: Effect;
    },
  ): t.Func<I, O, WasmMat> {
    const enableMdk = false;
    return genWasm(this._id, enableMdk, inp, out, {
      ...data,
      funcName: data.func,
    });
  }

  fromMdk<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    data: {
      opName: string;
      wasm: string;
      effect?: Effect;
    },
  ): t.Func<I, O, WasmMat> {
    const enableMdk = true;
    return genWasm(this._id, enableMdk, inp, out, {
      funcName: data.opName,
      wasm: data.wasm,
      effect: data.effect,
    });
  }
}

function genWasm<
  I extends t.Typedef = t.Typedef,
  O extends t.Typedef = t.Typedef,
>(
  runtimeId: number,
  enableMdk: boolean,
  inp: I,
  out: O,
  { funcName, wasm, effect = fx.read() }: {
    funcName: string;
    wasm: string;
    effect?: Effect;
  },
): t.Func<I, O, WasmMat> {
  const matId = runtimes.fromWasmModule(
    {
      runtime: runtimeId,
      effect,
    },
    {
      module: `file:${wasm}`,
      funcName,
      mdkEnabled: enableMdk,
    },
  );

  return t.func(inp, out, {
    _id: matId,
    effect,
    module: wasm,
    funcName,
  });
}
