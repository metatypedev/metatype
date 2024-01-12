// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { RawAuth } from "./typegraph.js";
import { Auth as Auth_, wit_utils } from "./wit.js";
import * as t from "./types.js";

export type StdOauth2Profiler =
  | { profiler: "default" }
  | { profiler: "none" }
  | { profiler: "extended"; extension: any }
  | { profiler: "custom"; id: number };

export function noProfiler(): StdOauth2Profiler {
  return { profiler: "none" };
}

export function defaultProfiler(): StdOauth2Profiler {
  return { profiler: "default" };
}

export function extendedProfiler(extension: any): StdOauth2Profiler {
  return { profiler: "extended", extension };
}

export function customProfiler(func: t.Typedef): StdOauth2Profiler {
  return { profiler: "custom", id: func._id };
}

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

  private static stdOauth2(
    provider: string,
    scopes: string,
    profiler: StdOauth2Profiler,
  ): RawAuth {
    switch (profiler.profiler) {
      case "none":
        return new RawAuth(wit_utils.oauth2WithoutProfiler(provider, scopes));
      case "extended":
        return new RawAuth(
          wit_utils.oauth2WithExtendedProfiler(
            provider,
            scopes,
            JSON.stringify(profiler.extension),
          ),
        );
      case "custom":
        return new RawAuth(
          wit_utils.oauth2WithCustomProfiler(provider, scopes, profiler.id),
        );
      default:
        return new RawAuth(wit_utils.oauth2(provider, scopes));
    }
  }

  static oauth2Digitalocean(
    scopes: string,
    profiler?: StdOauth2Profiler,
  ): RawAuth {
    return Auth.stdOauth2(
      "digitalocean",
      scopes,
      profiler ?? defaultProfiler(),
    );
  }

  static oauth2Discord(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("discord", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Dropbox(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("dropbox", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Facebook(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("facebook", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Github(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("github", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Gitlab(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("gitlab", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Google(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("google", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Instagram(
    scopes: string,
    profiler?: StdOauth2Profiler,
  ): RawAuth {
    return Auth.stdOauth2("instagram", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Linkedin(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("linkedin", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Microsoft(
    scopes: string,
    profiler?: StdOauth2Profiler,
  ): RawAuth {
    return Auth.stdOauth2("microsoft", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Reddit(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("reddit", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Slack(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("slack", scopes, profiler ?? defaultProfiler());
  }

  static oauth2Stackexchange(
    scopes: string,
    profiler?: StdOauth2Profiler,
  ): RawAuth {
    return Auth.stdOauth2(
      "stackexchange",
      scopes,
      profiler ?? defaultProfiler(),
    );
  }

  static oauth2Twitter(scopes: string, profiler?: StdOauth2Profiler): RawAuth {
    return Auth.stdOauth2("twitter", scopes, profiler ?? defaultProfiler());
  }
}
