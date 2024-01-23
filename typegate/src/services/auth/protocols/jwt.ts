// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as jwt from "jwt";
import { getLogger } from "../../../log.ts";
import { SecretManager } from "../../../typegraph/mod.ts";
import { Protocol } from "./protocol.ts";
import { DenoRuntime } from "../../../runtimes/deno/deno.ts";
import { Auth } from "../../../typegraph/types.ts";

const logger = getLogger(import.meta);
const encoder = new TextEncoder();

export class JWTAuth extends Protocol {
  static async init(
    typegraphName: string,
    auth: Auth,
    secretManager: SecretManager,
    _denoRuntime: DenoRuntime,
  ): Promise<Protocol> {
    const { format, algorithm } = auth.auth_data;
    const sourceEnv = secretManager.secretOrFail(`${auth.name}_JWT`);
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
    typegraphName: string,
    private signKey: CryptoKey,
  ) {
    super(typegraphName);
  }

  async tokenMiddleware(
    token: string,
    _request: Request,
  ): Promise<[Record<string, unknown>, string | null]> {
    try {
      const claims = await jwt.verify(token, this.signKey);
      return [claims, null];
    } catch (e) {
      if (e.message.includes("jwt is expired")) {
        throw new Error("jwt expired");
      }
      if (e.message.includes("jwt is used too early")) {
        throw new Error("jwt used too early");
      }
      logger.warning(`jwt auth failed: ${e}`);
      throw new Error("jwt is invalid");
    }
  }
}
