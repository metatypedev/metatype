// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "./engine.ts";
import { Runtime } from "./runtimes/Runtime.ts";
import type { TypeGraphDS, TypeMaterializer } from "./typegraph.ts";
import { ObjectNode, TypeNode } from "./type_node.ts";
import * as ast from "graphql/ast";
import { ComputeArg } from "./planner/args.ts";

export interface Parents {
  [key: string]: (() => Promise<unknown> | unknown) | unknown;
}

export interface Variables {
  [key: string]: unknown;
}

export interface Context {
  [key: string]: unknown;
}

interface ResolverArgsBase {
  _: {
    parent: Parents;
    // FIXME : variables really needed?
    variables: Variables;
    context: Context;
    [dep: string]: unknown;
  };
}

export type ResolverArgs<T = Record<string, any>> = T & ResolverArgsBase;

export type Resolver<T = Record<string, any>> = (
  args: ResolverArgs<T>,
) => Promise<any> | any;

export type Batcher = (x: any) => any;

export interface RuntimeInitParams {
  typegraph: TypeGraphDS;
  materializers: TypeMaterializer[];
  args: Record<string, unknown>;
}
export type RuntimeInit = Record<
  string,
  (params: RuntimeInitParams) => Promise<Runtime> | Runtime
>;

export interface ComputeStageProps {
  operationName: string;
  operationType: ast.OperationTypeNode;
  dependencies: string[];
  parent?: ComputeStage;
  args: Record<string, ComputeArg>;
  resolver?: Resolver;
  argumentNodes?: ReadonlyArray<ast.ArgumentNode>;
  inpType?: ObjectNode;
  outType: TypeNode; // only temp
  typeIdx: number;
  runtime: Runtime;
  materializer?: TypeMaterializer;
  batcher: Batcher;
  node: string;
  path: string[];
  rateCalls: boolean;
  rateWeight: number;
}

export interface OperationPolicies {
  // the list of all `PolicyList`s for a single operation
  policyLists: Array<PolicyList>;
  factory: AuthorizationFactory;
}

export type PolicyList = Array<number>;

// A function to ensure that a policy list is verified with the given args
// under the context stored in the closure
//
// Throws if any policy fails to authorize the operation or no policy could decide
export type AuthorizeFn = (
  policyList: PolicyList,
  args: Record<string, unknown>,
) => Promise<void>;

// A function that generates an authorization function `AuthorizeFn` with the given context
export type AuthorizationFactory = (context: Context) => AuthorizeFn;
