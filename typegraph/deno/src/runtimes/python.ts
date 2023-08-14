// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";
import { Materializer, Runtime } from "./mod.ts";

interface LambdaMat extends Materializer {
  fn: string;
  name: string;
  effect: Effect;
}

interface DefMat extends Materializer {
  fn: string;
  name: string;
  effect: Effect;
}

export class PythonRuntime extends Runtime {
  constructor() {
    super(runtimes.registerPythonRuntime());
  }

  fromLambda(code: string) {
    // TODO: hash sha256, digest utf8 sync
    const name = code.replace(/[^A-Za-z0-9_]/g, "_");
    const matId = runtimes.fromPythonLambda(
      {
        runtime: this._id,
        effect: { tag: "none" },
      },
      {
        name,
        fn: code, // not formatted
        runtime: this._id,
      },
    );

    return {
      _id: matId,
      name,
      fn: code,
    } as LambdaMat;
  }

  // unlike python, name must be provided in ts
  fromDef(code: string) {
    const name = code.trim().match(/def\s+([A-Za-z0-9_]+)/)?.[1];
    if (name == undefined) {
      throw new Error(`unable to extract def name from source code ${code}`);
    }
    const matId = runtimes.fromPythonDef(
      {
        runtime: this._id,
        effect: { tag: "none" },
      },
      {
        name: name,
        fn: code,
        runtime: this._id,
      },
    );

    return {
      _id: matId,
      name,
      fn: code,
    } as DefMat;
  }
}
