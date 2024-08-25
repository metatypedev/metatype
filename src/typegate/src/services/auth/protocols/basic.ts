// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SystemTypegraph } from "../../../system_typegraphs.ts";
import { b64decode } from "../../../utils.ts";
import type { SecretManager } from "../../../typegraph/mod.ts";
import type { TypegateConfigBase } from "../../../config.ts";
import { Protocol, type TokenMiddlewareOutput } from "./protocol.ts";
import type { DenoRuntime } from "../../../runtimes/deno/deno.ts";
import type { Auth } from "../../../typegraph/types.ts";

type BasicAuthConfig = Pick<TypegateConfigBase, "tg_admin_password">;

export class BasicAuth extends Protocol {
  static init(
    typegraphName: string,
    auth: Auth,
    secretManager: SecretManager,
    _denoRuntime: DenoRuntime,
    config: BasicAuthConfig,
  ): Promise<Protocol> {
    const tokens = new Map();
    for (const user of auth.auth_data.users as string[]) {
      const password = SystemTypegraph.check(typegraphName)
        ? config.tg_admin_password
        : secretManager.secretOrFail(`BASIC_${user}`);
      tokens.set(user, password);
    }
    return Promise.resolve(new BasicAuth(typegraphName, tokens));
  }

  private constructor(
    typegraphName: string,
    private hashes: Map<string, string>,
  ) {
    super(typegraphName);
  }

  tokenMiddleware(
    jwt: string,
    _request: Request,
  ): Promise<TokenMiddlewareOutput> {
    try {
      const [username, token] = b64decode(jwt).split(
        ":",
      );

      const hash = this.hashes.get(username);
      const claims = hash && token === hash
        ? {
          username,
        }
        : {};

      return Promise.resolve({
        claims,
        nextToken: null,
        error: null,
      });
    } catch {
      return Promise.resolve({
        claims: {},
        nextToken: null,
        error: "Invalid token",
      });
    }
  }
}
