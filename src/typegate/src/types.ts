// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ComputeStage } from "./engine/query_engine.ts";
import type { Runtime } from "./runtimes/Runtime.ts";
import type {
  SecretManager,
  TypeGraphDS,
  TypeMaterializer,
} from "./typegraph/mod.ts";
import type { TypeNode } from "./typegraph/type_node.ts";
import type * as ast from "graphql/ast";
import type { ComputeArg } from "./engine/planner/args.ts";
import type { EffectType, PolicyIndices } from "./typegraph/types.ts";
import type { VariantMatcher } from "./engine/typecheck/matching_variant.ts";
import type { Typegate } from "./typegate/mod.ts";
import type { WitWireMatInfo } from "../engine/runtime.d.ts";

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

export interface WitOpArgs {
  opName: string;
  args: ResolverArgs;
  id: string;
  componentPath: string;
  ops: WitWireMatInfo[];
}

export type Batcher = (x: any) => any;

// deno-lint-ignore no-empty-interface
export interface RuntimeDataBase {}

export interface RuntimeInitParams<
  RTData extends RuntimeDataBase = RuntimeDataBase,
> {
  typegraph: TypeGraphDS;
  typegraphName: string;
  materializers: TypeMaterializer[];
  args: RTData;
  secretManager: SecretManager;
  typegate: Typegate;
}

export interface RuntimeInit {
  (params: RuntimeInitParams): Promise<Runtime> | Runtime;
}

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
  excludeResult?: true;
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
