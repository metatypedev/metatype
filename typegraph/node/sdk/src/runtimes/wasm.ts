// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../index.js";

export class WasmRuntime extends Runtime {
  static reflected(modulePath: string) {
    return new WasmRuntimeReflected(modulePath);
  }
  static wire(modulePath: string) {
    return new WasmRuntimeWire(modulePath);
  }
}

interface ReflectedFuncWasmMat extends Materializer {
  funcName: string;
  effect: Effect;
}

interface WireHandlerWasmMat extends Materializer {
  funcName: string;
  effect: Effect;
}

class WasmRuntimeWire extends WasmRuntime {
  constructor(artifactPath: string) {
    super(
      runtimes.registerWasmWireRuntime({
        wasmArtifact: artifactPath,
      }),
    );
  }

  handler<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { func, effect = fx.read() }: {
      func: string;
      effect?: Effect;
    },
  ): t.Func<I, O, WireHandlerWasmMat> {
    const matId = runtimes.fromWasmWireHandler(
      {
        runtime: this._id,
        effect,
      },
      {
        funcName: func,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      effect,
      funcName: func,
    });
  }
}

class WasmRuntimeReflected extends WasmRuntime {
  constructor(artifactPath: string) {
    super(
      runtimes.registerWasmReflectedRuntime({
        wasmArtifact: artifactPath,
      }),
    );
  }

  fromExport<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { func, effect = fx.read() }: {
      func: string;
      effect?: Effect;
    },
  ): t.Func<I, O, ReflectedFuncWasmMat> {
    const matId = runtimes.fromWasmReflectedFunc(
      {
        runtime: this._id,
        effect,
      },
      {
        funcName: func,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      effect,
      funcName: func,
    });
  }
}
