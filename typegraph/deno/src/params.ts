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

  static oauth2Digitalocean(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("digitalocean", scopes));
  }

  static oauth2Discord(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("discord", scopes));
  }

  static oauth2Dropbox(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("dropbox", scopes));
  }

  static oauth2Facebook(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("facebook", scopes));
  }

  static oauth2Github(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("github", scopes));
  }

  static oauth2Gitlab(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("gitlab", scopes));
  }

  static oauth2Google(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("google", scopes));
  }

  static oauth2Instagram(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("instagram", scopes));
  }

  static oauth2Linkedin(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("linkedin", scopes));
  }

  static oauth2Microsoft(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("microsoft", scopes));
  }

  static oauth2Reddit(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("reddit", scopes));
  }

  static oauth2Slack(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("slack", scopes));
  }

  static oauth2Stackexchange(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("stackexchange", scopes));
  }

  static oauth2Twitter(scopes: string): RawAuth {
    return new RawAuth(wit_utils.oauth2("twitter", scopes));
  }
}
