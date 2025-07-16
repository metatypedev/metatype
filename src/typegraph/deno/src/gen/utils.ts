// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { rpcRequest } from "./client.ts";
import type { TypeId } from "./core.ts";

export type ReduceEntry = {
  path: string[]
  injectionData: string
}

export type AuthProtocol =
  | "oauth2"
  | "jwt"
  | "basic";

export type Auth = {
  name: string
  protocol: AuthProtocol
  authData: [string, string][]
}

export type QueryDeployParams = {
  tg: string
  secrets?: [string, string][]
}

export type FdkConfig = {
  workspacePath: string
  targetName: string
  configJson: string
  tgJson: string
}

export type FdkOutput = {
  path: string
  content: string
  overwrite: boolean
}

export function reduceb(super_type_id: TypeId, entries: ReduceEntry[]): TypeId {
  return rpcRequest("reduceb", { super_type_id, entries });
}

export function addGraphqlEndpoint(graphql: string): number {
  return rpcRequest("add_graphql_endpoint", { graphql });
}

export function addAuth(data: Auth): number {
  return rpcRequest("add_auth", { data });
}

export function addRawAuth(data: string): number {
  return rpcRequest("add_raw_auth", { data });
}

export function oauth2(service_name: string, scopes: string): string {
  return rpcRequest("oauth2", { service_name, scopes });
}

export function oauth2WithoutProfiler(service_name: string, scopes: string): string {
  return rpcRequest("oauth2_without_profiler", { service_name, scopes });
}

export function oauth2WithExtendedProfiler(service_name: string, scopes: string, extension: string): string {
  return rpcRequest("oauth2_with_extended_profiler", { service_name, scopes, extension });
}

export function oauth2WithCustomProfiler(service_name: string, scopes: string, profiler: TypeId): string {
  return rpcRequest("oauth2_with_custom_profiler", { service_name, scopes, profiler });
}

export function gqlDeployQuery(params: QueryDeployParams): string {
  return rpcRequest("gql_deploy_query", { params });
}

export function gqlRemoveQuery(tg_name: string[]): string {
  return rpcRequest("gql_remove_query", { tg_name });
}

export function gqlPingQuery(): string {
  return rpcRequest("gql_ping_query", null);
}

export function metagenExec(config: FdkConfig): FdkOutput[] {
  return rpcRequest("metagen_exec", { config });
}

export function metagenWriteFiles(items: FdkOutput[], typegraph_dir: string): void {
  return rpcRequest("metagen_write_files", { items, typegraph_dir });
}