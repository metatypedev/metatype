// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { RawAuth } from "./typegraph.ts";
import { type Auth as Auth_, sdkUtils } from "./sdk.ts";
import type * as t from "./types.ts";
import type { Oauth2Client } from "./gen/utils.ts";

export type StdOauth2Profiler =
  | { profiler: "default" }
  | { profiler: "none" }
  // deno-lint-ignore no-explicit-any
  | { profiler: "extended"; extension: any }
  | { profiler: "custom"; id: number };

export function noProfiler(): StdOauth2Profiler {
  return { profiler: "none" };
}

export function defaultProfiler(): StdOauth2Profiler {
  return { profiler: "default" };
}

// deno-lint-ignore no-explicit-any
export function extendedProfiler(extension: any): StdOauth2Profiler {
  return { profiler: "extended", extension };
}

export function customProfiler(func: t.Typedef): StdOauth2Profiler {
  return { profiler: "custom", id: func._id };
}

type OAuthParams = {
  provider: string;
  scopes: string[];
  type?: "oidc";
  profiler?: StdOauth2Profiler;
  clients: Oauth2Client[];
};

type PartialOAuthParams = Omit<OAuthParams, "provider">;

export class Auth {
  static jwt(name: string, format: string, algorithmParams?: object): Auth_ {
    if (!algorithmParams) {
      algorithmParams = {};
    }
    const authData = [
      ["format", JSON.stringify(format)],
      ["algorithm", JSON.stringify(algorithmParams)],
    ] as [string, string][];

    return {
      name,
      authData,
      protocol: "jwt",
    };
  }

  static hmac256(name: string): Auth_ {
    return Auth.jwt(name, "raw", {
      name: "HMAC",
      hash: { name: "SHA-256" },
    });
  }

  static basic(users: string[]): Auth_ {
    const authData = [["users", JSON.stringify(users)]] as [string, string][];
    return {
      name: "basic",
      protocol: "basic",
      authData,
    };
  }

  private static stdOauth2(params: OAuthParams): RawAuth {
    const scopes = params.scopes.join(" ");
    const profiler = params.profiler ?? defaultProfiler();
    const baseParams = {
      provider: params.provider,
      clients: params.clients,
      scopes,
    };

    switch (profiler.profiler) {
      case "none":
        return new RawAuth(sdkUtils.oauth2WithoutProfiler(baseParams));
      case "extended":
        return new RawAuth(
          sdkUtils.oauth2WithExtendedProfiler(
            baseParams,
            JSON.stringify(profiler.extension),
          ),
        );
      case "custom":
        return new RawAuth(
          sdkUtils.oauth2WithCustomProfiler(baseParams, profiler.id),
        );
      default:
        return new RawAuth(sdkUtils.oauth2(baseParams));
    }
  }

  static oauth2Digitalocean(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "digitalocean", ...params });
  }

  static oauth2Discord(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "discord", ...params });
  }

  static oauth2Dropbox(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "dropbox", ...params });
  }

  static oauth2Facebook(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "facebook", ...params });
  }

  static oauth2Github(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "github", ...params });
  }

  static oauth2Gitlab(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "gitlab", ...params });
  }

  static oauth2Google(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "google", ...params });
  }

  static oauth2Instagram(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "instagram", ...params });
  }

  static oauth2Linkedin(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "linkedin", ...params });
  }

  static oauth2Microsoft(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "microsoft", ...params });
  }

  static oauth2Reddit(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "reddit", ...params });
  }

  static oauth2Slack(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "slack", ...params });
  }

  static oauth2Stackexchange(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "stackexchange", ...params });
  }

  static oauth2Twitter(params: PartialOAuthParams): RawAuth {
    return Auth.stdOauth2({ provider: "twitter", ...params });
  }
}
