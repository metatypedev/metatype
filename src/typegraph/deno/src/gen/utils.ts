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

export type Oauth2Client = {
  idSecret: string
  redirectUriSecret: string
}

export type BaseOauth2Params = {
  provider: string
  scopes: string
  clients: Oauth2Client[]
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

export function oauth2(params: BaseOauth2Params): string {
  return rpcRequest("oauth2", { params });
}

export function oauth2WithoutProfiler(params: BaseOauth2Params): string {
  return rpcRequest("oauth2_without_profiler", { params });
}

export function oauth2WithExtendedProfiler(params: BaseOauth2Params, extension: string): string {
  return rpcRequest("oauth2_with_extended_profiler", { params, extension });
}

export function oauth2WithCustomProfiler(params: BaseOauth2Params, profiler: TypeId): string {
  return rpcRequest("oauth2_with_custom_profiler", { params, profiler });
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