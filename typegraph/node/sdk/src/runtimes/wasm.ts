// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../index.js";
import { getFileHash } from "../utils/file_utils.js";

interface WasmMat extends Materializer {
  module: string;
  funcName: string;
  effect: Effect;
}

export class WasmRuntime extends Runtime {
  constructor() {
    super(runtimes.registerWasmRuntime());
  }

  async fromWasm<
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
  ): Promise<t.Func<I, O, WasmMat>> {
    const enableMdk = false;
    return genWasm(this._id, enableMdk, inp, out, {
      ...data,
      funcName: data.func,
    });
  }

  async fromMdk<
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
  ): Promise<t.Func<I, O, WasmMat>> {
    const enableMdk = true;
    return genWasm(this._id, enableMdk, inp, out, {
      funcName: data.opName,
      wasm: data.wasm,
      effect: data.effect,
    });
  }
}

async function genWasm<
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
): Promise<t.Func<I, O, WasmMat>> {
  let artifactHash = await getFileHash(wasm);

  const matId = runtimes.fromWasmModule(
    {
      runtime: runtimeId,
      effect,
    },
    {
      module: `file:${wasm}`,
      funcName,
      artifactHash,
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
