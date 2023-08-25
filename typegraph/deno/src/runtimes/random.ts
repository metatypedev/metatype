// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import {
  Effect,
  RandomRuntimeData,
} from "../../gen/exports/metatype-typegraph-runtimes.d.ts";
import { Materializer, Runtime } from "./mod.ts";

interface RandomMat extends Materializer {
  runtime: number;
}

export class RandomRuntime extends Runtime {
  constructor(data: RandomRuntimeData) {
    super(runtimes.registerRandomRuntime(data));
  }

  gen(inp: t.Typedef) {
    const effect = { tag: "none" } as Effect;

    const matId = runtimes.createRandomMat(
      {
        runtime: this._id,
        effect,
      },
      {
        runtime: this._id,
      },
    );

    return t.func(
      t.struct({}),
      inp,
      { _id: matId, runtime: this._id } as RandomMat,
    );
  }
}
