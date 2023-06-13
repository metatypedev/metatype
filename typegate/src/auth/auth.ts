// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { JWTAuth } from "./protocols/jwt.ts";
import { BasicAuth } from "./protocols/basic.ts";
import { OAuth2Auth } from "./protocols/oauth2.ts";

import type { Auth as AuthDS } from "../types/typegraph.ts";
import { SecretManager } from "../typegraph.ts";
import { Engine } from "../engine.ts";
import { clearCookie, getEncryptedCookie } from "./cookies.ts";
import { Protocol } from "./protocols/protocol.ts";
import { getLogger } from "../log.ts";
import { DenoRuntime } from "../runtimes/deno/deno.ts";
export { AuthDS };

const logger = getLogger(import.meta.url);

export const nextAuthorizationHeader = "next-authorization";
export const internalAuthName = "internal";

export async function handleAuthService(
  request: Request,
  engine: Engine,
): Promise<Response | null> {
  if (request.method !== "GET") {
    return null;
  }

  const url = new URL(request.url);
  const [providerName] = url.pathname.split("/").slice(
    3,
    4,
  );

  const origin = request.headers.get("origin") ?? "";

  if (providerName === "take") {
    const headers = clearCookie(url.hostname, engine.name);
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
            headers,
          },
        );
      }
      headers.set("content-type", "application/json");
      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers,
      });
    } catch (e) {
      logger.info(`take request failed ${e}`);
      return new Response("not authorized", {
        status: 401,
        headers,
      });
    }
  }

  const provider = engine.tg.auths.get(providerName);
  if (!provider) {
    const providers = Array.from(engine.tg.auths.entries()).filter(([name]) =>
      name !== internalAuthName
    ).map((
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

export function initAuth(
  typegraphName: string,
  auth: AuthDS,
  secretManager: SecretManager,
  denoRuntime: DenoRuntime,
): Promise<Protocol> {
  switch (auth.protocol) {
    case "oauth2":
      return OAuth2Auth.init(typegraphName, auth, secretManager, denoRuntime);
    case "basic":
      return BasicAuth.init(typegraphName, auth, secretManager, denoRuntime);
    case "jwt":
      return JWTAuth.init(typegraphName, auth, secretManager, denoRuntime);
    default:
      throw new Error(`${auth.protocol} not yet supported`);
  }
}

export type JWTClaims = {
  provider: string;
  accessToken: string;
  refreshToken: string;
  refreshAt: number;
  profile: Record<string, unknown>;
  scope?: string[];
};
