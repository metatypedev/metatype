// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { JWTAuth } from "./protocols/jwt.ts";
import { BasicAuth } from "./protocols/basic.ts";
import { OAuth2Auth } from "./protocols/oauth2.ts";

import type { Auth } from "../../typegraph/types.ts";
import { SecretManager, TypeGraph } from "../../typegraph/mod.ts";

import { Protocol } from "./protocols/protocol.ts";
import { DenoRuntime } from "../../runtimes/deno/deno.ts";
import { unsafeExtractJWT } from "../../crypto.ts";
import { QueryEngine } from "../../engine/query_engine.ts";
import { clearCookie, getEncryptedCookie } from "../auth/cookies.ts";
import { getLogger } from "../../log.ts";
import { methodNotAllowed } from "../../services/responses.ts";
import { Runtime } from "../../runtimes/Runtime.ts";

const logger = getLogger(import.meta);

export const nextAuthorizationHeader = "next-authorization";
export const internalAuthName = "internal";
export type AdditionalAuthParams = {
  tg: TypeGraph;
  runtimeReferences: Runtime[];
};

export function initAuth(
  typegraphName: string,
  auth: Auth,
  secretManager: SecretManager,
  denoRuntime: DenoRuntime,
  authParameters: AdditionalAuthParams,
): Promise<Protocol> {
  switch (auth.protocol) {
    case "oauth2":
      return OAuth2Auth.init(
        typegraphName,
        auth,
        secretManager,
        authParameters,
      );
    case "basic":
      return BasicAuth.init(typegraphName, auth, secretManager, denoRuntime);
    case "jwt":
      return JWTAuth.init(typegraphName, auth, secretManager, denoRuntime);
    default:
      throw new Error(`${auth.protocol} not yet supported`);
  }
}

export type ProfileClaims = {
  [key: `profile.${string}`]: unknown;
};

export type JWTClaims = {
  provider: string;
  accessToken: string;
  refreshToken: string;
  refreshAt: number;
  scope?: string[];
} & ProfileClaims;

export async function ensureJWT(
  request: Request,
  engine: QueryEngine,
  headers: Headers,
): Promise<[Record<string, unknown>, Headers]> {
  const [kind, token] = (request.headers.get("Authorization") ?? "").split(
    " ",
  );
  if (!token) {
    return [{}, headers];
  }

  let auth: Protocol | null = null;
  if (kind.toLowerCase() === "basic") {
    auth = engine.tg.auths.get("basic") ?? null;
  } else {
    try {
      const { provider } = await unsafeExtractJWT(token);
      if (!provider) {
        // defaulting to first auth
        auth = engine.tg.auths.values().next().value;
      } else {
        auth = engine.tg.auths.get(provider as string) ?? null;
      }
    } catch (e) {
      logger.warning(`malformed jwt: ${e}`);
    }
  }

  if (!auth) {
    return [{}, headers];
  }

  const [context, nextAuth] = await auth.tokenMiddleware(
    token,
    request,
  );
  if (nextAuth !== null) {
    // "" is valid as it signal to remove the token
    headers.set(nextAuthorizationHeader, nextAuth);
  }
  return [context, headers];
}

export async function handleAuth(
  request: Request,
  engine: QueryEngine,
  headers: Headers,
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  const url = new URL(request.url);
  const [providerName] = url.pathname.split("/").slice(
    3,
    4,
  );

  const origin = request.headers.get("origin") ?? "";

  if (providerName === "take") {
    const resHeaders = clearCookie(url.hostname, engine.name, headers);
    try {
      const { token, redirectUri } = await getEncryptedCookie(
        request.headers,
        engine.name,
      );

      if (!redirectUri.startsWith(origin)) {
        return new Response(
          "take request must share domain with redirect uri",
          {
            status: 400,
            headers: resHeaders,
          },
        );
      }
      resHeaders.set("content-type", "application/json");
      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers: resHeaders,
      });
    } catch (e) {
      logger.info(`take request failed ${e}`);
      return new Response("not authorized", {
        status: 401,
        headers: resHeaders,
      });
    }
  }

  const provider = engine.tg.auths.get(providerName);
  if (!provider) {
    const providers = Array.from(engine.tg.auths.entries()).filter((
      [name],
    ) => name !== internalAuthName).map((
      [name, _auth],
    ) => ({
      name,
      uri:
        `${url.protocol}//${url.host}/${engine.name}/auth/${name}?redirect_uri=${origin}`,
    }));
    return new Response(JSON.stringify({ providers }), {
      headers: { "content-type": "application/json" },
    });
  }

  return await provider.authMiddleware(request);
}
