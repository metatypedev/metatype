// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../mod.js";

interface LambdaMat extends Materializer {
  fn: string;
  effect: Effect;
}

interface DefMat extends Materializer {
  fn: string;
  name: string;
  effect: Effect;
}

interface PythonImport {
  name: string;
  module: string;
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
  fromLambda<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(inp: I, out: O, { code }: { code: string }) {
    const matId = runtimes.fromPythonLambda(
      {
        runtime: this._id,
        effect: fx.read(),
      },
      {
        fn: code, // not formatted
        runtime: this._id,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      fn: code,
    } as LambdaMat);
  }

  fromDef<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(inp: I, out: O, { code }: { code: string }) {
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
        fn: code,
        runtime: this._id,
      },
    );

    return t.func(inp, out, {
      _id: matId,
      name,
      fn: code,
    } as DefMat);
  }

  import<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { name, module, effect = fx.read(), secrets = [] }: PythonImport,
  ): t.Func<P, I, O, ImportMat> {
    const base = {
      runtime: this._id,
      effect,
    };

    const matId = runtimes.fromPythonModule(base, {
      file: module,
      runtime: this._id,
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
