// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../engine.ts";
import { gq } from "../gq.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { Runtime } from "./Runtime.ts";
import * as GraphQL from "graphql";
import { Kind } from "graphql";
import { OperationDefinitionNode, OperationTypeNode } from "graphql/ast";
import * as ForwardVars from "./utils/graphql_forward_vars.ts";
import * as InlineVars from "./utils/graphql_inline_vars.ts";
import { getLogger } from "../log.ts";
import { mapKeys } from "std/collections/map_keys.ts";

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

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { args } = params;
    return await new GraphQLRuntime(args.endpoint as string);
  }

  async deinit(): Promise<void> {}

  execute(query: FromVars<string>, path: string[]): Resolver {
    if (path.length == 0) {
      throw new Error("Path cannot be empty");
    }
    return async ({ _: { variables }, ...args }) => {
      const vars = { ...variables, ...mapKeys(args, (key) => `_arg_${key}`) };
      const q = query(vars);
      // TODO: filter variables - only include forwared variables
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
    const renames: Record<string, string> = {};

    const operationLevel = stage.props.path.length;
    for (const field of fields) {
      const { node, path } = field.props;
      if (mat?.name == "prisma_operation" && path.length === operationLevel) {
        const { operation, table } = mat.data as {
          operation: string;
          table: string;
        };
        renames[node] = operation + table;
      }
    }

    // TODO extract function: build query
    const operationType = mat?.effect.effect != null
      ? OperationTypeNode.MUTATION
      : OperationTypeNode.QUERY;

    const { selections, vars: forwardedVars } = ForwardVars
      .rebuildGraphQuery({
        stages: fields,
        renames,
      });
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
    const queryFromVars: FromVars<string> = this.inlineVars
      ? InlineVars.withInlinedVars(
        query,
        forwardedVars.map((varDef) => varDef.variable.name.value),
      )
      : () => query;

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
        queryFromVars,
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
}
