// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth } from "../auth.ts";
import { signJWT, verifyJWT } from "../../crypto.ts";

export class InternalAuth implements Auth {
  static init(typegraphName: string): Promise<Auth> {
    return Promise.resolve(new InternalAuth(typegraphName));
  }

  static emit(): Promise<string> {
    const claims = {
      provider: "internal",
    };
    return signJWT(claims, 30);
  }

  private constructor(
    public typegraphName: string,
  ) {}

  authMiddleware(_request: Request): Promise<Response> {
    const res = new Response("not found", {
      status: 404,
    });
    return Promise.resolve(res);
  }

  async tokenMiddleware(
    token: string,
    _url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    try {
      const claims = await verifyJWT(token);
      if (claims.provider === "internal") {
        return [claims, new Headers()];
      }
    } catch {
      // invalid jwt
    }
    return [{}, new Headers()];
  }
}
