// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { JWKAuth } from "./protocols/jwt.ts";
import { BasicAuth } from "./protocols/basic.ts";
import { OAuth2Auth } from "./protocols/oauth2.ts";

import type { Auth as AuthDS } from "../types/typegraph.ts";
export { AuthDS };

// localhost:7890/biscuicuits/auth/github?redirect_uri=localhost:7890/biscuicuits
export const nextAuthorizationHeader = "Next-Authorization";

export abstract class Auth {
  static init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    switch (auth.protocol) {
      case "oauth2":
        return OAuth2Auth.init(typegraphName, auth);
      case "basic":
        return BasicAuth.init(typegraphName, auth);
      case "jwk":
        return JWKAuth.init(typegraphName, auth);
      default:
        throw new Error(`${auth.protocol} not yet supported`);
    }
  }

  protected constructor(public typegraphName: string, public auth: AuthDS) {}

  abstract authMiddleware(request: Request): Promise<Response>;

  abstract tokenMiddleware(
    token: string,
  ): Promise<[Record<string, unknown>, Headers]>;
}
