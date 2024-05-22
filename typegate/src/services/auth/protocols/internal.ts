// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypegateCryptoKeys } from "../../../crypto.ts";
import { Protocol, TokenMiddlewareOutput } from "./protocol.ts";

export class InternalAuth extends Protocol {
  static init(
    typegraphName: string,
    cryptoKeys: TypegateCryptoKeys,
  ): Promise<Protocol> {
    return Promise.resolve(new InternalAuth(typegraphName, cryptoKeys));
  }

  // TODO non-static
  static emit(cryptoKeys: TypegateCryptoKeys): Promise<string> {
    const claims = {
      provider: "internal",
    };
    return cryptoKeys.signJWT(claims, 30);
  }

  private constructor(
    typegraphName: string,
    private cryptoKeys: TypegateCryptoKeys,
  ) {
    super(typegraphName);
  }

  async tokenMiddleware(
    token: string,
    _request: Request,
  ): Promise<TokenMiddlewareOutput> {
    try {
      const claims = await this.cryptoKeys.verifyJWT(token);
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
