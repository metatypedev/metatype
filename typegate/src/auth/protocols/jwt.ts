// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth, AuthDS } from "../auth.ts";
import * as jwt from "jwt";
import { signKey as nativeSignKey } from "../../crypto.ts";
import { envOrFail } from "../../utils.ts";

export type JWTClaims = {
  provider: string;
  accessToken: string;
  refreshToken: string;
  refreshAt: number;
};

export class JWKAuth implements Auth {
  static async init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    if (auth.name === "native") {
      return new JWKAuth(typegraphName, auth, nativeSignKey);
    }
    const jwk = envOrFail(typegraphName, `${auth.name}_JWK`);
    const signKey = await crypto.subtle.importKey(
      "jwk",
      jwk as JsonWebKey,
      auth.auth_data as unknown as
        | AlgorithmIdentifier
        | HmacImportParams
        | RsaHashedImportParams
        | EcKeyImportParams,
      false,
      ["verify"],
    );
    return new JWKAuth(typegraphName, auth, signKey);
  }

  private constructor(
    public typegraphName: string,
    public auth: AuthDS,
    private signKey: CryptoKey,
  ) {}

  authMiddleware(_request: Request): Promise<Response> {
    const res = new Response("not found", {
      status: 404,
    });
    return Promise.resolve(res);
  }

  async tokenMiddleware(
    token: string,
  ): Promise<[Record<string, unknown>, Headers]> {
    try {
      const claims = await jwt.verify(token, this.signKey);
      return [claims, new Headers()];
    } catch {
      return [{}, new Headers()];
    }
  }
}
