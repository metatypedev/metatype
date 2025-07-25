// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { JWTAuth } from "./protocols/jwt.ts";
import { BasicAuth } from "./protocols/basic.ts";
import { OAuth2Auth } from "./protocols/oauth2.ts";

import type { Auth } from "../../typegraph/types.ts";
import type { SecretManager, TypeGraph } from "../../typegraph/mod.ts";

import type { Protocol } from "./protocols/protocol.ts";
import type { DenoRuntime } from "../../runtimes/deno/deno.ts";
import { unsafeExtractJWT } from "../../crypto.ts";
import type { QueryEngine } from "../../engine/query_engine.ts";
import * as routes from "./routes/mod.ts";
import { getLogger } from "../../log.ts";
import { jsonOk, methodNotAllowed } from "../../services/responses.ts";
import type { Runtime } from "../../runtimes/Runtime.ts";

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
      return BasicAuth.init(typegraphName, auth, secretManager, denoRuntime, {
        tg_admin_password:
          authParameters.tg.typegate.config.base.tg_admin_password,
      });
    case "jwt":
      return JWTAuth.init(typegraphName, auth, secretManager, denoRuntime);
    default:
      throw new Error(`${auth.protocol} not yet supported`);
  }
}

export type JWTClaims = {
  provider: string;
  profile: null | Record<string, unknown>;
  iat: number;
  exp: number;
};

export async function ensureJWT(
  request: Request,
  engine: QueryEngine,
  headers: Headers,
): Promise<[Record<string, unknown>, Headers]> {
  const [kind, token] = (request.headers.get("Authorization") ?? "").split(" ");
  if (!token) {
    return [{}, headers];
  }

  let auth: Protocol | undefined;
  if (kind.toLowerCase() === "basic") {
    auth = engine.tg.auths.get("basic") ?? undefined;
  } else {
    try {
      const { provider } = await unsafeExtractJWT(token);
      if (!provider) {
        // defaulting to first auth
        auth = engine.tg.auths.values().next().value;
      } else {
        auth = engine.tg.auths.get(provider as string);
      }
    } catch (e) {
      logger.warn(`malformed jwt: ${e}`);
    }
  }

  if (!auth) {
    return [{}, headers];
  }

  const { claims, nextToken, error } = await auth.tokenMiddleware(
    token,
    request,
  );
  if (error) {
    logger.info("error on jwt {}", { error });
  }
  if (nextToken !== null) {
    // "" is valid as it signal to remove the token
    headers.set(nextAuthorizationHeader, nextToken);
  }
  return [claims, headers];
}

export async function handleAuth(
  request: Request,
  engine: QueryEngine,
  headers: Headers,
): Promise<Response> {
  const url = new URL(request.url);
  const [pathName] = url.pathname.split("/").slice(3, 4);

  if (request.method === "POST" && pathName === "token") {
    return await routes.token({ request, engine, headers });
  }

  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  const origin = request.headers.get("origin") ?? "";

  const provider = engine.tg.auths.get(pathName);
  if (!provider) {
    const providers = Array.from(engine.tg.auths.entries())
      .filter(([name]) => name !== internalAuthName)
      .map(([name, _auth]) => ({
        name,
        uri:
          `${url.protocol}//${url.host}/${engine.name}/auth/${name}?redirect_uri=${origin}`,
      }));
    return jsonOk({ data: providers });
  }

  return await provider.authMiddleware(request, engine);
}
