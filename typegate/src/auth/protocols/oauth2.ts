// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { AuthDS, nextAuthorizationHeader } from "../auth.ts";
import config from "../../config.ts";
import { OAuth2Client, OAuth2ClientConfig, Tokens } from "oauth2_client";
import { encrypt, randomUUID, signJWT, verifyJWT } from "../../crypto.ts";
import { JWTClaims } from "../auth.ts";
import { getLogger } from "../../log.ts";
import { SecretManager } from "../../typegraph.ts";
import {
  clearCookie,
  getEncryptedCookie,
  setEncryptedSessionCookie,
} from "../cookies.ts";
import { Protocol } from "./protocol.ts";
import { DenoRuntime } from "../../runtimes/deno/deno.ts";
import { Materializer } from "../../types/typegraph.ts";

const logger = getLogger(import.meta.url);

export class OAuth2Auth extends Protocol {
  static init(
    typegraphName: string,
    auth: AuthDS,
    secretManager: SecretManager,
    denoRuntime: DenoRuntime,
  ): Promise<Protocol> {
    const clientId = secretManager.secretOrFail(`${auth.name}_CLIENT_ID`);
    const clientSecret = secretManager.secretOrFail(
      `${auth.name}_CLIENT_SECRET`,
    );
    const { authorize_url, access_url, scopes, profile_url, profiler } =
      auth.auth_data;
    const clientData = {
      clientId,
      clientSecret,
      authorizationEndpointUri: authorize_url as string,
      tokenUri: access_url as string,
      defaults: {
        scope: scopes as string,
      },
    };
    return Promise.resolve(
      new OAuth2Auth(
        typegraphName,
        auth.name,
        clientData,
        profile_url as string | null,
        denoRuntime,
        profiler
          ? OAuth2Auth.materializerForProfiler(profiler as string)
          : null,
      ),
    );
  }

  static materializerForProfiler(
    profiler: string,
  ): Materializer {
    return {
      name: "function",
      runtime: -1, // dummy
      effect: {
        effect: "none",
        idempotent: true,
      },
      data: {
        script: `var _my_lambda = ${profiler};`,
      },
    } as Materializer;
  }

  private constructor(
    typegraphName: string,
    private authName: string,
    private clientData: Omit<OAuth2ClientConfig, "redirectUri">,
    private profileUrl: string | null,
    private denoRuntime: DenoRuntime,
    private profiler: Materializer | null,
  ) {
    super(typegraphName);
  }

  async authMiddleware(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    const typegraphPath = `/${this.typegraphName}`;
    const loginPath = `${typegraphPath}/auth/${this.authName}`;
    const client = new OAuth2Client({
      ...this.clientData,
      redirectUri: `${base}${loginPath}`,
    });
    const query = Object.fromEntries(url.searchParams.entries());

    // callback
    if (query.code && query.state) {
      try {
        const { state, codeVerifier, userRedirectUri } =
          await getEncryptedCookie(
            request.headers,
            this.typegraphName,
          );
        const tokens = await client.code.getToken(url, { state, codeVerifier });
        const token = await this.createJWT(tokens);
        const headers = await setEncryptedSessionCookie(
          url.hostname,
          this.typegraphName,
          { token, redirectUri: userRedirectUri },
        );
        headers.set("location", userRedirectUri as string);
        return new Response(null, {
          status: 302,
          headers,
        });
      } catch (e) {
        logger.warning(e);
        const headers = clearCookie(url.hostname, this.typegraphName);
        // https://github.com/cmd-johnson/deno-oauth2-client/issues/25
        return new Response(`invalid oauth2, check your credentials: ${e}`, {
          status: 400,
          headers,
        });
      }
    }

    // initiate
    const userRedirectUri = query.redirect_uri ?? request.headers.get("origin");
    if (userRedirectUri) {
      const state = randomUUID();
      const { codeVerifier, uri } = await client.code.getAuthorizationUri({
        state,
      });
      const loginState = {
        state,
        codeVerifier,
        userRedirectUri,
      };
      const headers = await setEncryptedSessionCookie(
        url.hostname,
        this.typegraphName,
        loginState,
      );
      headers.set("location", uri.toString());
      return new Response(null, {
        status: 302,
        headers,
      });
    }

    return new Response("missing origin or redirect_uri query parameter", {
      status: 400,
    });
  }

  async tokenMiddleware(
    token: string,
    url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    const typegraphPath = `/${this.typegraphName}`;
    const client = new OAuth2Client({
      ...this.clientData,
      redirectUri:
        `${url.protocol}//${url.host}${typegraphPath}/auth/${this.authName}`,
    });

    if (!token) {
      return [{}, new Headers()];
    }
    const jwt = await verifyJWT(token).catch((e) => {
      logger.info(`invalid auth: ${e}`);
      return null;
    }) as JWTClaims | null;

    if (!jwt) {
      return [{}, new Headers({ [nextAuthorizationHeader]: "" })];
    }

    const { refreshToken, ...claims } = jwt;
    if (new Date().valueOf() / 1000 > claims.refreshAt) {
      try {
        const newClaims = await client.refreshToken.refresh(refreshToken);
        const token = await this.createJWT(newClaims);
        return [
          claims,
          new Headers({ [nextAuthorizationHeader]: token ?? "" }),
        ];
      } catch (e) {
        logger.info(`expired auth: ${e}`);
        return [{}, new Headers({ [nextAuthorizationHeader]: "" })];
      }
    }

    return [claims, new Headers()];
  }

  private async getProfile(
    token: Tokens,
  ): Promise<null | Record<string, unknown>> {
    if (!this.profileUrl) {
      return null;
    }
    try {
      const verb = this.profileUrl.startsWith("http")
        ? "GET"
        : this.profileUrl.split("@")[0];
      const url = this.profileUrl.replace(`${verb}@`, "");
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "authorization": `${token.tokenType} ${token.accessToken}`,
        },
      });
      let profile = await res.json();

      if (this.profiler) {
        profile = await this.denoRuntime.delegate(this.profiler, false)(
          // dummy values
          { ...profile, _: { info: { url } } },
        );
      }

      return profile;
    } catch (e) {
      throw new Error(`failed to fetch profile: ${e}`);
    }
  }

  private async createJWT(token: Tokens): Promise<string> {
    const profile = await this.getProfile(token);
    const payload: JWTClaims = {
      provider: this.authName,
      accessToken: token.accessToken,
      refreshToken: await encrypt(token.refreshToken as string),
      refreshAt: Math.floor(
        new Date().valueOf() / 1000 +
          (token.expiresIn ?? config.jwt_refresh_duration_sec),
      ),
      scope: token.scope,
      profile,
    };
    return await signJWT(payload, config.jwt_max_duration_sec);
  }
}
