import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";
import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Materializer, Runtime } from "./mod.ts";

interface GraphQLQuery {
  path: string[];
}

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
    return t.func(inp, out, new QueryMat(matId, path));
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
    return t.func(inp, out, new MutationMat(matId, effect, path));
  }
}

export class QueryMat extends Materializer {
  constructor(_id: number, public readonly path: string[]) {
    super(_id);
  }
}

export class MutationMat extends Materializer {
  constructor(
    _id: number,
    public readonly effect: Effect,
    public readonly path: string[],
  ) {
    super(_id);
  }
}
