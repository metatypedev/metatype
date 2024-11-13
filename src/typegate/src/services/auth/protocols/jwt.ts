// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as jwt from "jwt";
import { getLogger } from "../../../log.ts";
import type { SecretManager } from "../../../typegraph/mod.ts";
import { Protocol, type TokenMiddlewareOutput } from "./protocol.ts";
import type { DenoRuntime } from "../../../runtimes/deno/deno.ts";
import type { Auth } from "../../../typegraph/types.ts";

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
    const authName = auth.name.toLocaleUpperCase();
    const sourceEnv = secretManager.secretOrFail(`${authName}_JWT`);
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
  ): Promise<TokenMiddlewareOutput> {
    try {
      const claims = await jwt.verify(token, this.signKey);
      return {
        claims,
        nextToken: null,
        error: null,
      };
    } catch (e) {
      if (e.message.includes("jwt is expired")) {
        throw new Error("jwt expired");
      }
      if (e.message.includes("jwt is used too early")) {
        throw new Error("jwt used too early");
      }
      logger.warn(`jwt auth failed: ${e}`);
      throw new Error("jwt is invalid");
    }
  }
}
