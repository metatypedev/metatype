// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { TypeId } from "./core.d.ts";
import type { UInt } from "./primitives.d.ts";

type ReduceEntry = {
  path: string[];
  injection_data: string;
};

type AuthProtocol = "oauth2" | "jwt" | "basic";

type Auth = {
  name: string;
  protocol: AuthProtocol;
  auth_data: [string, string][]; // string => json string
};

type QueryDeployParams = {
  tg: string;
  secrets?: [string, string][];
};

type FdkConfig = {
  workspace_path: string;
  target_name: string;
  config_json: string;
  tg_json: string;
};

type FdkOutput = {
  path: string;
  content: string;
  overwrite: boolean;
};

type Oauth2Client = {
  id_secret: string;
  redirect_uri_secret: string;
};

type BaseOauth2Params = {
  provider: string;
  scopes: string;
  clients: Oauth2Client[];
};

type reduceb = (super_type_id: TypeId, entries: ReduceEntry[]) => TypeId;

type add_graphql_endpoint = (graphql: string) => UInt;

type add_auth = (data: Auth) => UInt;

type add_raw_auth = (data: string) => UInt;

type oauth2 = (params: BaseOauth2Params) => string;

type oauth2_without_profiler = (params: BaseOauth2Params) => string;

type oauth2_with_extended_profiler = (
  params: BaseOauth2Params,
  extension: string,
) => string;

type oauth2_with_custom_profiler = (
  params: BaseOauth2Params,
  profiler: TypeId,
) => string;

type gql_deploy_query = (params: QueryDeployParams) => string;

type gql_remove_query = (tg_name: string[]) => string;

type gql_ping_query = () => string;

type metagen_exec = (config: FdkConfig) => FdkOutput[];

type metagen_write_files = (items: FdkOutput[], typegraph_dir: string) => void;

export type {
  ReduceEntry,
  AuthProtocol,
  Auth,
  QueryDeployParams,
  FdkConfig,
  FdkOutput,
  reduceb,
  add_graphql_endpoint,
  add_auth,
  add_raw_auth,
  oauth2,
  oauth2_without_profiler,
  oauth2_with_extended_profiler,
  oauth2_with_custom_profiler,
  gql_deploy_query,
  gql_remove_query,
  gql_ping_query,
  metagen_exec,
  metagen_write_files,
};
