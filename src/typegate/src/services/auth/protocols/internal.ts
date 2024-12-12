// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { TypegateCryptoKeys } from "../../../crypto.ts";
import { getLogger } from "../../../log.ts";
import { Protocol, type TokenMiddlewareOutput } from "./protocol.ts";

const logger = getLogger(import.meta);

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
    // FIXME: this breaks substantial
    return cryptoKeys.signJWT(claims, 60 * 10);
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
    } catch (e) {
      logger.error(`failed to verify the token: ${e.message ?? e}`);
      return {
        claims: {},
        nextToken: null,
        error: "invalid token",
      };
    }
  }
}
