// Copyright Metatype under the Elastic License 2.0.

import { ComputeStage } from "../engine.ts";
import { gq } from "../gq.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { Runtime } from "./Runtime.ts";
import * as ForwardVars from "./utils/graphql_forward_vars.ts";
import * as InlineVars from "./utils/graphql_inline_vars.ts";

export interface FromVars<T> {
  (variables: Record<string, unknown>): T;
}

export class GraphQLRuntime extends Runtime {
  endpoint: string;
  forwardVars = true;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  disableVariables() {
    this.forwardVars = false;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { args } = params;
    return await new GraphQLRuntime(args.endpoint as string);
  }

  async deinit(): Promise<void> {}

  execute(query: string | FromVars<string>): Resolver {
    return async ({ _: { variables } }) => {
      const q = typeof query === "function" ? query(variables) : query;
      console.log(`remote query: ${q}`);
      // TODO: filter variables - only include forwared variables
      const ret = await gq(this.endpoint, q, variables);
      return ret.data;
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const serial = stage.props.materializer?.data.serial;
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    const fields = [stage, ...sameRuntime];
    const renames: Record<string, string> = {
      ql: "typegraph",
    };
    for (const field of fields) {
      const { node, materializer: mat } = field.props;
      if (mat?.name == "prisma_operation") {
        const { operation, table } = mat.data as {
          operation: string;
          table: string;
        };
        renames[node] = operation + table;
      }
    }

    const query = (() => {
      const op = serial ? "mutation" : "query";
      console.log("forwardVars", this.forwardVars);
      if (this.forwardVars) {
        const [rebuiltQuery, forwardedVars] = ForwardVars.rebuildGraphQuery({
          stages: fields,
          renames,
        });
        const vars = Object.entries(forwardedVars).map(([name, type]) =>
          `$${name}: ${type}`
        ).join(", ");
        return `${op} Q${
          vars.length === 0 ? "" : `(${vars})`
        } {${rebuiltQuery} }`;
      } else {
        const query = InlineVars.rebuildGraphQuery({
          stages: fields,
          renames,
        });
        return (vars: Record<string, unknown>) => `${op} {${query(vars)} }`;
      }
    })();

    verbose &&
      console.log(
        "remote graphql:",
        typeof query === "string" ? query : " with inlined vars",
      );

    const queryStage = new ComputeStage({
      dependencies: [],
      args: {},
      policies: {},
      resolver: this.execute(query),
      outType: {
        // dummy
        name: "string",
        typedef: "string",
        policies: [],
        runtime: -1,
        data: {},
      },
      runtime: stage.props.runtime,
      batcher: (x: any) => x,
      node: "",
      path: [...stage.props.path.slice(0, -1), "query"],
      rateCalls: stage.props.rateCalls,
      rateWeight: stage.props.rateWeight,
    });
    stagesMat.push(queryStage);

    for (const field of fields) {
      if (field.props.parent?.id() === stage.props.parent?.id()) {
        const resolver: Resolver = ({
          _: { [queryStage.id()]: queryRes },
        }) => {
          const fieldName = field.props.path[field.props.path.length - 1];
          const resolver =
            (queryRes as any)[0][renames[fieldName] ?? fieldName];
          const ret = typeof resolver === "function" ? resolver() : resolver;
          return ret;
        };
        stagesMat.push(
          new ComputeStage({
            ...field.props,
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          }),
        );
      } else {
        const resolver: Resolver = ({ _: { parent } }) => {
          const resolver = parent[field.props.node];
          const ret = typeof resolver === "function" ? resolver() : resolver;
          return ret;
        };
        stagesMat.push(
          new ComputeStage({
            ...field.props,
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          }),
        );
      }
    }

    return stagesMat;
  }
}
