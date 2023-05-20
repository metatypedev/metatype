// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { JWTAuth } from "./protocols/jwt.ts";
import { BasicAuth } from "./protocols/basic.ts";
import { OAuth2Auth } from "./protocols/oauth2.ts";

import type { Auth as AuthDS } from "../types/typegraph.ts";
import { SecretManager } from "../typegraph.ts";
export { AuthDS };

export const nextAuthorizationHeader = "Next-Authorization";

export abstract class Auth {
  static init(
    typegraphName: string,
    auth: AuthDS,
    secretManager: SecretManager,
  ): Promise<Auth> {
    switch (auth.protocol) {
      case "oauth2":
        return OAuth2Auth.init(typegraphName, auth, secretManager);
      case "basic":
        return BasicAuth.init(typegraphName, auth, secretManager);
      case "jwt":
        return JWTAuth.init(typegraphName, auth, secretManager);
      default:
        throw new Error(`${auth.protocol} not yet supported`);
    }
  }

  protected constructor(public typegraphName: string) {}

  abstract authMiddleware(request: Request): Promise<Response>;

  abstract tokenMiddleware(
    token: string,
    url: URL,
  ): Promise<[Record<string, unknown>, Headers]>;
}

export type JWTClaims = {
  provider: string;
  accessToken: string;
  refreshToken: string;
  refreshAt: number;
};
