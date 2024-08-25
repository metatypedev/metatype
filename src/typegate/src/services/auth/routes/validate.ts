// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { RouteParams } from "./mod.ts";

export function badRequest(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: { "content-type": "text/plain" },
  });
}

type Action =
  | { action: null }
  | { action: "update_token"; token: string }
  | { action: "clear_token"; error: string };

type ValidateResponse = {
  state: "valid" | "invalid" | "expired";
} & Action;

export async function validate(params: RouteParams): Promise<Response> {
  const { request, engine, headers } = params;
  const url = new URL(request.url);
  const search = url.searchParams;
  const token = search.get("token");
  const protocol = search.get("protocol");
  const providerName = search.get("provider");

  if (!token) {
    return badRequest("token missing");
  }
  if (protocol === null) {
    return badRequest("protocol missing");
  }
  if (protocol !== "oauth2") {
    return badRequest(`protocol not supported: ${protocol}`);
  }
  if (!providerName) {
    return badRequest("provider missing");
  }

  const provider = engine.tg.auths.get(providerName!);
  if (!provider) {
    return badRequest(`provider not found: ${providerName}`);
  }

  const { nextToken, error } = await provider.tokenMiddleware(token, request);

  let result: ValidateResponse;

  if (nextToken == null) {
    result = {
      state: "valid",
      action: null,
    };
  } else if (nextToken === "") {
    result = {
      state: "invalid",
      action: "clear_token",
      error: error!,
    };
  } else {
    result = {
      state: "expired",
      action: "update_token",
      token: nextToken,
    };
  }

  // return json response
  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}
