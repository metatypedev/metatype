// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { signJWT, verifyJWT } from "../../../crypto.ts";
import { Protocol } from "./protocol.ts";

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
    _url: URL,
  ): Promise<[Record<string, unknown>, string | null]> {
    try {
      const claims = await verifyJWT(token);
      if (claims.provider === "internal") {
        return [claims, null];
      }
    } catch {
      // invalid jwt
    }
    return [{}, null];
  }
}
