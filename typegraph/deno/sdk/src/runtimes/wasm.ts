// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Effect } from "../gen/typegraph_core.d.ts";
import { Materializer, Runtime } from "./mod.ts";
import { fx } from "../index.ts";

export class WasmRuntime extends Runtime {
  /** create reflected wasm runtime */
  static reflected(modulePath: string): WasmRuntimeReflected {
    return new WasmRuntimeReflected(modulePath);
  }
  /** create a wasm runtime using the wire protocol */
  static wire(modulePath: string): WasmRuntimeWire {
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

  handler<I extends t.Typedef = t.Typedef, O extends t.Typedef = t.Typedef>(
    inp: I,
    out: O,
    {
      name,
      effect = fx.read(),
    }: {
      name: string;
      effect?: Effect;
    },
  ): t.Func<I, O, WireHandlerWasmMat> {
    const matId = runtimes.fromWasmWireHandler(
      {
        runtime: this._id,
        effect,
      },
      {
        funcName: name,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      effect,
      funcName: name,
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

  export<I extends t.Typedef = t.Typedef, O extends t.Typedef = t.Typedef>(
    inp: I,
    out: O,
    {
      name,
      effect = fx.read(),
    }: {
      name: string;
      effect?: Effect;
    },
  ): t.Func<I, O, ReflectedFuncWasmMat> {
    const matId = runtimes.fromWasmReflectedFunc(
      {
        runtime: this._id,
        effect,
      },
      {
        funcName: name,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      effect,
      funcName: name,
    });
  }
}
