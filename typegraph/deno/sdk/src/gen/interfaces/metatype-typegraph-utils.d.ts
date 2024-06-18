export namespace MetatypeTypegraphUtils {
  export function genReduceb(supertypeId: TypeId, data: Reduce): TypeId;
  export function addGraphqlEndpoint(graphql: string): number;
  export function addAuth(data: Auth): number;
  export function addRawAuth(data: string): number;
  export function oauth2(serviceName: string, scopes: string): string;
  export function oauth2WithoutProfiler(serviceName: string, scopes: string): string;
  export function oauth2WithExtendedProfiler(serviceName: string, scopes: string, extension: string): string;
  export function oauth2WithCustomProfiler(serviceName: string, scopes: string, profiler: TypeId): string;
  export function gqlDeployQuery(params: QueryDeployParams): string;
  export function gqlRemoveQuery(tgName: string[]): string;
  export function removeInjections(typeId: TypeId): TypeId;
  export function metagenExec(config: MdkConfig): MdkOutput[];
  export function metagenWriteFiles(items: MdkOutput[], typegraphDir: string): void;
}
import type { Error } from './metatype-typegraph-core.js';
export { Error };
export type TypeId = number;
export interface ReduceValue {
  inherit: boolean,
  payload?: string,
}
export interface ReducePath {
  path: string[],
  value: ReduceValue,
}
export interface Reduce {
  paths: ReducePath[],
}
export type AuthProtocol = AuthProtocolOauth2 | AuthProtocolJwt | AuthProtocolBasic;
export interface AuthProtocolOauth2 {
  tag: 'oauth2',
}
export interface AuthProtocolJwt {
  tag: 'jwt',
}
export interface AuthProtocolBasic {
  tag: 'basic',
}
export interface Auth {
  name: string,
  protocol: AuthProtocol,
  authData: [string, string][],
}
export interface QueryDeployParams {
  tg: string,
  secrets?: [string, string][],
}
export interface MdkConfig {
  workspacePath: string,
  targetName: string,
  configJson: string,
  tgJson: string,
}
export interface MdkOutput {
  path: string,
  content: string,
  overwrite: boolean,
}
