// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "../engine.ts";
import { gq } from "../gq.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { Runtime } from "./Runtime.ts";
import * as GraphQL from "graphql";
import { Kind } from "graphql";
import { OperationDefinitionNode, OperationTypeNode } from "graphql/ast";
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

  execute(query: string | FromVars<string>, path: string[]): Resolver {
    if (path.length == 0) {
      throw new Error("Path cannot be empty");
    }
    return async ({ _: { variables } }) => {
      const q = typeof query === "function" ? query(variables) : query;
      // TODO: filter variables - only include forwared variables
      const ret = await gq(this.endpoint, q, variables);
      if (ret.errors) {
        console.error(ret.errors);
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
      const operationType = serial
        ? OperationTypeNode.MUTATION
        : OperationTypeNode.QUERY;
      if (this.forwardVars) {
        const { selections, vars: forwaredVars } = ForwardVars
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
          variableDefinitions: forwaredVars,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections,
          },
        };
        const ret = GraphQL.print(op);
        return ret;
      } else {
        const query = InlineVars.rebuildGraphQuery({
          stages: fields,
          renames,
        });
        return (vars: Record<string, unknown>) =>
          `${operationType} {${query(vars)} }`;
      }
    })();

    verbose &&
      console.log(
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
}
