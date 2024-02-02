// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";

export interface BasicAuth {
  username: string;
  password: string;
}

export interface TypegraphDeployParams {
  baseUrl: string;
  auth?: BasicAuth;
  secrets: Record<string, string>;
  cliVersion: string;
}

export async function tgDeploy(
  typegraph: TypegraphOutput,
  params: TypegraphDeployParams,
) {
  const { baseUrl, cliVersion, secrets, auth } = params;
  const { serialized } = typegraph;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append(
      "Authorization",
      `Basic ${btoa(auth.username + ":" + auth.password)}`,
    );
  }

  const response = await fetch(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.genGqlquery({
      cliVersion,
      tg: serialized,
      secrets: Object.entries(secrets ?? {}),
    }),
  });
  return handleResponse(response);
}

async function handleResponse(
  response: Response,
): Promise<Record<string, any> | string> {
  if (response.headers.get("Content-Type") == "application/json") {
    return await response.json();
  }
  return await response.text();
}
