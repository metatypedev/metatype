// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";

export class BasicAuth {
  constructor(public username: string, public password: string) {
  }
  asHeaderValue(): string {
    return `Basic ${btoa(this.username + ":" + this.password)}`;
  }
}

export interface TypegraphDeployParams {
  baseUrl: string;
  auth?: BasicAuth;
  artifactsConfig: ArtifactResolutionConfig;
  secrets: Record<string, string>;
  cliVersion: string;
}

export interface TypegraphRemoveParams {
  baseUrl: string;
  auth?: BasicAuth;
}

export interface DeployResult {
  serialized: string;
  typegate: Record<string, any> | string;
}

export interface RemoveResult {
  typegate: Record<string, any> | string;
}

export async function tgDeploy(
  typegraph: TypegraphOutput,
  params: TypegraphDeployParams,
): Promise<DeployResult> {
  const { baseUrl, cliVersion, secrets, auth, artifactsConfig } = params;
  const serialized = typegraph.serialize(artifactsConfig);

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  const response = await fetch(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlDeployQuery({
      cliVersion,
      tg: serialized,
      secrets: Object.entries(secrets ?? {}),
    }),
  });
  return {
    serialized,
    typegate: await handleResponse(response),
  };
}

export async function tgRemove(
  typegraph: TypegraphOutput,
  params: TypegraphRemoveParams,
): Promise<RemoveResult> {
  const { baseUrl, auth } = params;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  const response = await fetch(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlRemoveQuery([typegraph.name]),
  });
  return {
    typegate: await handleResponse(response),
  };
}

async function handleResponse(
  response: Response,
): Promise<Record<string, any> | string> {
  if (response.headers.get("Content-Type") == "application/json") {
    return await response.json();
  }
  return await response.text();
}
