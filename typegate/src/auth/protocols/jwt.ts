// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth, AuthDS } from "../auth.ts";
import * as jwt from "jwt";
import { envOrFail } from "../../utils.ts";

export class JWKAuth implements Auth {
  static async init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    const jwk = JSON.parse(envOrFail(typegraphName, `${auth.name}_JWK`));
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
    return new JWKAuth(typegraphName, signKey);
  }

  private constructor(
    public typegraphName: string,
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
    _url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    try {
      const claims = await jwt.verify(token, this.signKey);
      return [claims, new Headers()];
    } catch {
      return [{}, new Headers()];
    }
  }
}
