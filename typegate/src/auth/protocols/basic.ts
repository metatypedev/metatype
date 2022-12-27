// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth, AuthDS } from "../auth.ts";
import * as bcrypt from "bcrypt";
import * as _bcrypt from "_bcrypt"; // https://github.com/JamesBroadberry/deno-bcrypt/issues/31
import { SystemTypegraph } from "../../system_typegraphs.ts";
import { b64decode, envOrFail } from "../../utils.ts";

export class BasicAuth implements Auth {
  static async init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    const tokens = new Map();
    for (const user of auth.auth_data.users as string[]) {
      const password = SystemTypegraph.check(typegraphName)
        ? envOrFail(user, "password")
        : envOrFail(typegraphName, `${auth.name}_${user}`);
      const token = await bcrypt.hash(password);
      tokens.set(user, token);
    }
    return Promise.resolve(new BasicAuth(typegraphName, auth, tokens));
  }

  private constructor(
    public typegraphName: string,
    public auth: AuthDS,
    private hashes: Map<string, string>,
  ) {}

  authMiddleware(_request: Request): Promise<Response> {
    const res = new Response("not found", {
      status: 404,
    });
    return Promise.resolve(res);
  }

  async tokenMiddleware(
    jwt: string,
  ): Promise<[Record<string, unknown>, Headers]> {
    const [user, token] = b64decode(jwt).split(
      ":",
    );

    const hash = this.hashes.get(user);
    const claims = hash && await bcrypt.compare(token, hash)
      ? {
        user,
      }
      : {};

    return Promise.resolve([claims, new Headers()]);
  }
}
