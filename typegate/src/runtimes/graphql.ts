// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../engine/query_engine.ts";
import { gq } from "../transports/graphql/gq.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import type { GraphQLRuntimeData } from "../typegraph/types.ts";
import { Runtime } from "./Runtime.ts";
import * as GraphQL from "graphql";
import { Kind } from "graphql";
import { OperationDefinitionNode, OperationTypeNode } from "graphql/ast";
import { QueryRebuilder } from "./utils/graphql_forward_vars.ts";
import { withInlinedVars } from "./utils/graphql_inline_vars.ts";
import { getLogger } from "../log.ts";
import { Typegate } from "../typegate/mod.ts";

const logger = getLogger(import.meta);

export interface FromVars<T> {
  (variables: Record<string, unknown>): T;
}

export class GraphQLRuntime extends Runtime {
  endpoint: string;
  inlineVars = false;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  disableVariables() {
    this.inlineVars = true;
  }

  static async init(
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    const { args } = params as RuntimeInitParams<GraphQLRuntimeData>;
    return await new GraphQLRuntime(args.endpoint as string);
  }

  async deinit(): Promise<void> {}

  execute(query: FromVars<string>, path: string[]): Resolver {
    if (path.length == 0) {
      throw new Error("Path cannot be empty");
    }
    return async ({ _: { variables }, ...args }) => {
      const vars = { ...variables, ...args };
      const q = query(vars);
      // TODO: filter variables - only include forwarded variables
      logger.debug(`remote graphql: ${q}`);
      logger.debug(` -- with variables: ${JSON.stringify(vars)}`);
      const ret = await gq(this.endpoint, q, vars);
      if (ret.errors) {
        logger.error(ret.errors);
        throw new Error(`From remote graphql: ${ret.errors[0].message}`);
      }
      return path.reduce((r, field) => r[field], ret.data);
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const { materializer: mat } = stage.props;
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    const fields = [stage, ...sameRuntime];
    const renames = this.getRenames(fields);

    const operationType = mat!.name === "query"
      ? OperationTypeNode.QUERY
      : OperationTypeNode.MUTATION;

    const query = this.buildQuery(fields, operationType, renames);

    verbose &&
      logger.debug(
        "remote graphql:",
        typeof query === "string" ? query : " with inlined vars",
      );

    const path = stage.props.path;

    const node = path[path.length - 1];
    if (node == null) {
      throw new Error("GraphQL cannot be used at the root of the typegraph");
    }
    const queryStage = stage.withResolver(
      this.execute(
        query,
        stage.props.materializer?.data.path as string[] ??
          [renames[node] ?? node],
      ),
    );

    stagesMat.push(queryStage);

    fields.shift();

    for (const field of fields) {
      if (field.props.parent?.id() === stage.props.parent?.id()) {
        const resolver: Resolver = ({
          _: ctx,
        }) => {
          const { [queryStage.id()]: queryRes } = ctx;
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

  buildQuery(
    stages: ComputeStage[],
    operationType: OperationTypeNode,
    renames: Record<string, string>,
  ): FromVars<string> {
    const { selections, vars: forwardedVars } = QueryRebuilder.rebuild(
      stages,
      renames,
    );
    const op: OperationDefinitionNode = {
      kind: Kind.OPERATION_DEFINITION,
      operation: operationType,
      name: {
        kind: Kind.NAME,
        value: operationType.slice(0, 1).toUpperCase(),
      },
      variableDefinitions: forwardedVars,
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections,
      },
    };
    const query = GraphQL.print(op);

    // TODO nested args???
    if (this.inlineVars) {
      return withInlinedVars(
        query,
        forwardedVars.map((varDef) => varDef.variable.name.value),
      );
    } else {
      return () => query;
    }
  }

  getRenames(_stages: ComputeStage[]): Record<string, string> {
    // default
    return {};
  }
}

Typegate.registerRuntime("graphql", GraphQLRuntime.init);
