// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "./engine.ts";
import { Runtime } from "./runtimes/Runtime.ts";
import type { TypeGraphDS, TypeMaterializer } from "./typegraph.ts";
import { ObjectNode, TypeNode } from "./type_node.ts";
import * as ast from "graphql/ast";
import { ComputeArg } from "./planner/args.ts";
import { EffectType } from "./types/typegraph.ts";

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
    variables: Variables;
    context: Context;
    effect: EffectType | null;
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

export type StageId = string;
export type PolicyIdx = number;
export type PolicyList = Array<PolicyIdx>;
export type TypeIdx = number;
