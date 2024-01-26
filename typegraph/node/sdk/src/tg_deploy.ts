// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypegraphOutput } from "./typegraph.js";

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
    body: JSON.stringify(gqlBody(serialized, cliVersion, secrets)),
  });

  return handleResponse(response);
}

function gqlBody(
  tg: String,
  cliVersion: string,
  secrets?: Record<string, string>,
) {
  const query = `
    mutation InsertTypegraph($tg: String!, $secrets: String!, $cliVersion: String!) {
        addTypegraph(fromString: $tg, secrets: $secrets, cliVersion: $cliVersion) {
            name
            messages { type text }
            migrations { runtime migrations }
            failure
        }
    }`;

  return {
    query: query,
    variables: {
      tg,
      secrets: JSON.stringify(secrets ?? {}),
      cliVersion,
    },
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
