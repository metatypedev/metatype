// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Typegraph } from "./typegraph.js";

export const CLI_CONSTRAINT_VERSION = "0.3.2";

export interface BasicAuth {
  username: string;
  password: string;
}

export interface TypegraphDeployParams {
  baseUrl: string;
  //   prefix?: string;
  auth?: BasicAuth;
  secrets: Record<string, string>;
  //   env: Record<string, string>;
}

export async function tgDeploy(
  typegraph: Typegraph,
  params: TypegraphDeployParams,
) {
  const { baseUrl, secrets, auth } = params;
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
    body: JSON.stringify(gqlBody(serialized, secrets)),
  });
  return await response.text();
}

function gqlBody(tg: String, secrets?: Record<string, string>) {
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
      cliVersion: CLI_CONSTRAINT_VERSION,
    },
  };
}
