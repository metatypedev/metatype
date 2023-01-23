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
  policies: Record<string, string[]>;
  resolver?: Resolver;
  argumentNodes?: ReadonlyArray<ast.ArgumentNode>;
  inpType?: ObjectNode;
  outType: TypeNode; // only temp
  runtime: Runtime;
  materializer?: TypeMaterializer;
  batcher: Batcher;
  node: string;
  path: string[];
  rateCalls: boolean;
  rateWeight: number;
}

export type PolicyStage = (
  args: Record<string, unknown>,
) => Promise<boolean | null>;
export type PolicyStages = Record<string, PolicyStage>;
export type PolicyStagesFactory = (
  context: Context,
) => PolicyStages;
