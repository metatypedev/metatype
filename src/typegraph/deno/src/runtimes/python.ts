// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../sdk.ts";
import type { Effect } from "../gen/runtimes.ts";
import { type Materializer, Runtime } from "./mod.ts";
import { fx } from "../index.ts";

interface LambdaMat extends Materializer {
  function: string;
  effect: Effect;
}

interface DefMat extends Materializer {
  function: string;
  name: string;
  effect: Effect;
}

interface PythonImport {
  name: string;
  module: string;
  deps?: Array<string>;
  secrets?: Array<string>;
  effect?: Effect;
}

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
    { name, module, deps = [], effect = fx.read(), secrets = [] }: PythonImport,
  ): t.Func<I, O, ImportMat> {
    const base = {
      runtime: this._id,
      effect,
    };

    const matId = runtimes.fromPythonModule(base, {
      file: module,
      runtime: this._id,
      deps: deps ?? [],
    });

    const pyModMatId = runtimes.fromPythonImport(base, {
      module: matId,
      funcName: name,
      secrets,
    });

    return t.func(inp, out, {
      _id: pyModMatId,
      module,
      name,
    });
  }
}
