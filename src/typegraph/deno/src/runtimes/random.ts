// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { RandomRuntimeData } from "../gen/typegraph_core.d.ts";
import { Materializer, Runtime } from "./mod.ts";
import { fx } from "../index.ts";

interface RandomMat extends Materializer {
  runtime: number;
}

export class RandomRuntime extends Runtime {
  constructor(data: RandomRuntimeData) {
    super(runtimes.registerRandomRuntime(data));
  }

  /** create a function for random value generation */
  gen(out: t.Typedef): t.Func {
    const effect = fx.read();

    const matId = runtimes.createRandomMat(
      {
        runtime: this._id,
        effect,
      },
      {
        runtime: this._id,
      },
    );

    return t.func(t.struct({}), out, {
      _id: matId,
      runtime: this._id,
    } as RandomMat);
  }
}
