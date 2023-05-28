// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { AuthDS } from "../auth.ts";
import * as bcrypt from "bcrypt";
import * as _bcrypt from "_bcrypt"; // https://github.com/JamesBroadberry/deno-bcrypt/issues/31
import { SystemTypegraph } from "../../system_typegraphs.ts";
import { b64decode } from "../../utils.ts";
import { SecretManager } from "../../typegraph.ts";
import config from "../../config.ts";
import { Protocol } from "./protocol.ts";

export class BasicAuth extends Protocol {
  static async init(
    typegraphName: string,
    auth: AuthDS,
    secretManager: SecretManager,
  ): Promise<Protocol> {
    const tokens = new Map();
    for (const user of auth.auth_data.users as string[]) {
      const password = SystemTypegraph.check(typegraphName)
        ? config.tg_admin_password
        : secretManager.secretOrFail(`BASIC_${user}`);
      const token = await bcrypt.hash(password);
      tokens.set(user, token);
    }
    return Promise.resolve(new BasicAuth(typegraphName, tokens));
  }

  private constructor(
    typegraphName: string,
    private hashes: Map<string, string>,
  ) {
    super(typegraphName);
  }

  async tokenMiddleware(
    jwt: string,
    _url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    try {
      const [username, token] = b64decode(jwt).split(
        ":",
      );

      const hash = this.hashes.get(username);
      const claims = hash && await bcrypt.compare(token, hash)
        ? {
          username,
        }
        : {};

      return [claims, new Headers()];
    } catch {
      return [{}, new Headers()];
    }
  }
}
