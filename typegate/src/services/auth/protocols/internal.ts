// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { signJWT, verifyJWT } from "../../../crypto.ts";
import { Protocol, TokenMiddlewareOutput } from "./protocol.ts";

export class InternalAuth extends Protocol {
  static init(typegraphName: string): Promise<Protocol> {
    return Promise.resolve(new InternalAuth(typegraphName));
  }

  static emit(): Promise<string> {
    const claims = {
      provider: "internal",
    };
    return signJWT(claims, 30);
  }

  private constructor(
    typegraphName: string,
  ) {
    super(typegraphName);
  }

  async tokenMiddleware(
    token: string,
    _request: Request,
  ): Promise<TokenMiddlewareOutput> {
    try {
      const claims = await verifyJWT(token);
      if (claims.provider === "internal") {
        return {
          claims,
          nextToken: null,
          error: null,
        };
      } else {
        return {
          claims: {},
          nextToken: null,
          error: null,
        };
      }
    } catch {
      return {
        claims: {},
        nextToken: null,
        error: "invalid token",
      };
    }
  }
}
