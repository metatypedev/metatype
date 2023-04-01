// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth, AuthDS } from "../auth.ts";
import * as jwt from "jwt";
import { envOrFail } from "../../utils.ts";
import { getLogger } from "../../log.ts";

const logger = getLogger(import.meta.url);
const encoder = new TextEncoder();

export class JWTAuth implements Auth {
  static async init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    const { format, algorithm } = auth.auth_data;
    const sourceEnv = envOrFail(typegraphName, `${auth.name}_JWT`);
    const key = format === "jwk"
      ? JSON.parse(sourceEnv)
      : encoder.encode(sourceEnv);

    const signKey = await crypto.subtle.importKey(
      format as any,
      key,
      algorithm as unknown as
        | AlgorithmIdentifier
        | HmacImportParams
        | RsaHashedImportParams
        | EcKeyImportParams,
      false,
      ["verify"],
    );
    return new JWTAuth(typegraphName, signKey);
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
    } catch (e) {
      logger.warning(`jwt auth failed: ${e}`);
      return [{}, new Headers()];
    }
  }
}
