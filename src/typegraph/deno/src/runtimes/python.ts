// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../sdk.ts";
import type { Effect } from "../gen/runtimes.ts";
import { type Materializer, Runtime } from "./mod.ts";
import { fx } from "../index.ts";
import { type ModuleImport, resolveModuleParams } from "../utils/module.ts";

export { Module as PythonModule } from "../utils/module.ts";

interface LambdaMat extends Materializer {
  function: string;
  effect: Effect;
}

interface DefMat extends Materializer {
  function: string;
  name: string;
  effect: Effect;
}

type PythonImport = ModuleImport;

interface ImportMat extends Materializer {
  module: string;
  name: string;
}

export class PythonRuntime extends Runtime {
  constructor() {
    super(runtimes.registerPythonRuntime());
  }

  /** create a function from a lambda */
  fromLambda<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(inp: I, out: O, { code }: { code: string }): t.Func {
    const matId = runtimes.fromPythonLambda(
      {
        runtime: this._id,
        effect: fx.read(),
      },
      {
        function: code, // not formatted
        runtime: this._id,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      function: code,
    } as LambdaMat);
  }

  /** create a function from a Python `def` function */
  fromDef<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(inp: I, out: O, { code }: { code: string }): t.Func {
    const name = code.trim().match(/def\s+([A-Za-z0-9_]+)/)?.[1];
    if (name == undefined) {
      throw new Error(`unable to extract def name from source code ${code}`);
    }
    const matId = runtimes.fromPythonDef(
      {
        runtime: this._id,
        effect: fx.read(),
      },
      {
        name: name,
        function: code,
        runtime: this._id,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      name,
      function: code,
    } as DefMat);
  }

  import<I extends t.Typedef = t.Typedef, O extends t.Typedef = t.Typedef>(
    inp: I,
    out: O,
    { effect = fx.read(), secrets = [], ...params }: PythonImport,
  ): t.Func<I, O, ImportMat> {
    const resolved = resolveModuleParams(params);
    const base = {
      runtime: this._id,
      effect,
    };

    const matId = runtimes.fromPythonModule(base, {
      file: resolved.module,
      deps: resolved.deps,
      runtime: this._id,
    });

    const pyModMatId = runtimes.fromPythonImport(base, {
      module: matId,
      funcName: resolved.funcName,
      secrets,
    });

    return t.func(inp, out, {
      _id: pyModMatId,
      module: resolved.module,
      name: resolved.funcName,
    });
  }
}
