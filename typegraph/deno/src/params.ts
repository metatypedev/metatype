// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { RawAuth } from "./typegraph.ts";
import { Auth as Auth_, wit_utils } from "./wit.ts";

export class Auth {
  static jwt(name: string, format: string, algorithm?: any): Auth_ {
    if (!algorithm) {
      algorithm = {};
    }
    const authData = [
      ["format", JSON.stringify(format)],
      ["algorithm", JSON.stringify(algorithm)],
    ] as [string, string][];

    return {
      name,
      authData,
      protocol: { tag: "jwt" },
    };
  }

  static hmac256(name: string): Auth_ {
    return Auth.jwt(name, "raw", {
      name: "HMAC",
      hash: { name: "SHA-256" },
    });
  }

  static basic(users: string[]): Auth_ {
    const authData = [
      ["users", JSON.stringify(users)],
    ] as [string, string][];
    return {
      name: "basic",
      protocol: { tag: "basic" },
      authData,
    };
  }

  static oauth2Github(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2Github(scopes));
  }
}
