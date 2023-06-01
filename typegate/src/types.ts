// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "./engine.ts";
import { Runtime } from "./runtimes/Runtime.ts";
import type {
  SecretManager,
  TypeGraphDS,
  TypeMaterializer,
} from "./typegraph.ts";
import { TypeNode } from "./type_node.ts";
import * as ast from "graphql/ast";
import { ComputeArg } from "./planner/args.ts";
import { EffectType, PolicyIndices } from "./types/typegraph.ts";
import { VariantMatcher } from "./typecheck/matching_variant.ts";

export interface Parents {
  [key: string]: (() => Promise<unknown> | unknown) | unknown;
}

export interface Variables {
  [key: string]: unknown;
}

export interface Context {
  [key: string]: unknown;
}

export interface Info {
  url: URL;
  headers: Record<string, string>;
}

interface ResolverArgsBase {
  _: {
    parent: Parents;
    variables: Variables;
    context: Context;
    effect: EffectType | null;
    info: Info;
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
  secretManager: SecretManager;
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
  args: ComputeArg<Record<string, unknown>> | null;
  resolver?: Resolver;
  argumentTypes?: Record<string, string>;
  argumentNodes?: ReadonlyArray<ast.ArgumentNode>;
  outType: TypeNode; // only temp
  effect: EffectType | null;
  typeIdx: number;
  runtime: Runtime;
  materializer?: TypeMaterializer;
  batcher: Batcher;
  node: string;
  path: string[];
  rateCalls: boolean;
  rateWeight: number;
  childSelection?: VariantMatcher;
  additionalSelections?: string[];
}

export type StageId = string;
export type PolicyIdx = number;
export type PolicyList = Array<PolicyIndices>;
export type TypeIdx = number;

export interface ComputedValueParams {
  variables: Variables;
  parent: Parents;
  context: Context;
  effect: EffectType | null;
}

export interface ComputedValue<T = unknown> {
  (params: ComputedValueParams): T;
}
