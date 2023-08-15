// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";
import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Materializer, Runtime } from "./mod.ts";
import * as effects from "../effects.ts";

export class GraphQLRuntime extends Runtime {
  constructor(private endpoint: string) {
    super(runtimes.registerGraphqlRuntime({
      endpoint,
    }));
  }

  query<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(inp: I, out: O, path: string[] = []): t.Func<P, I, O, QueryMat> {
    const matId = runtimes.graphqlQuery({
      runtime: this._id,
      effect: { tag: "none" },
    }, {
      path,
    });
    const mat: QueryMat = {
      _id: matId,
      path,
    };
    return t.func(inp, out, mat);
  }

  mutation<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    effect: Effect,
    path: string[] = [],
  ): t.Func<P, I, O, MutationMat> {
    const matId = runtimes.graphqlMutation({
      runtime: this._id,
      effect,
    }, {
      path,
    });
    const mat: MutationMat = {
      _id: matId,
      path,
    };
    return t.func(inp, out, mat);
  }
}

interface QueryMat extends Materializer {
  path: string[];
}

interface MutationMat extends QueryMat {
}
