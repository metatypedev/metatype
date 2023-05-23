// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Auth, AuthDS, nextAuthorizationHeader } from "../auth.ts";
import config from "../../config.ts";
import { deleteCookie, getCookies, setCookie } from "std/http/cookie.ts";
import { OAuth2Client, OAuth2ClientConfig, Tokens } from "oauth2_client";
import {
  decrypt,
  encrypt,
  randomUUID,
  signJWT,
  verifyJWT,
} from "../../crypto.ts";
import { JWTClaims } from "../auth.ts";
import { getLogger } from "../../log.ts";
import { SecretManager } from "../../typegraph.ts";

const logger = getLogger(import.meta.url);

export class OAuth2Auth implements Auth {
  static init(
    typegraphName: string,
    auth: AuthDS,
    secretManager: SecretManager,
  ): Promise<Auth> {
    const clientId = secretManager.secretOrFail(`${auth.name}_CLIENT_ID`);
    const clientSecret = secretManager.secretOrFail(
      `${auth.name}_CLIENT_SECRET`,
    );
    const { authorize_url, access_url, scopes, profile_url } = auth.auth_data;
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
        profile_url as string,
      ),
    );
  }

  private constructor(
    public typegraphName: string,
    private authName: string,
    private clientData: Omit<OAuth2ClientConfig, "redirectUri">,
    private profileUrl: string,
  ) {}

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

    if (query.clear !== undefined) {
      const headers = this.clearCookie(url.hostname, typegraphPath);
      if (query.redirect_uri) {
        headers.set("location", query.redirect_uri ?? base);
      }
      return new Response(null, {
        status: 302,
        headers,
      });
    }

    if (query.code && query.state) {
      try {
        const cookies = getCookies(request.headers);
        const loginStateEncrypted = cookies[this.typegraphName];
        if (!loginStateEncrypted) {
          throw new Error("missing login state");
        }
        const loginState = await decrypt(loginStateEncrypted);
        const { state, codeVerifier, redirectUri } = JSON.parse(loginState);

        const token = await client.code.getToken(url, { state, codeVerifier });
        const jwt = await this.createJWT(token, config.cookies_max_age_sec);
        const headers = this.createHeaders(
          jwt,
          config.cookies_max_age_sec,
          url.hostname,
        );

        headers.set("location", redirectUri as string);
        return new Response(null, {
          status: 302,
          headers,
        });
      } catch (e) {
        logger.warning(e);
        return new Response(`invalid oauth2: ${e}`, {
          status: 400,
        });
      }
    }

    if (query.redirect_uri) {
      const state = randomUUID();
      const { codeVerifier, uri } = await client.code.getAuthorizationUri({
        state,
      });

      const loginState = JSON.stringify({
        state,
        codeVerifier,
        redirectUri: query.redirect_uri,
      });
      const loginStateEncrypted = await encrypt(loginState);

      const headers = new Headers();
      headers.set("location", uri.toString());
      setCookie(headers, {
        // no maxAge or expires, so cookie expires at end of session
        name: this.typegraphName,
        value: loginStateEncrypted,
        domain: url.hostname,
        path: typegraphPath,
        secure: !config.debug,
        sameSite: "Lax",
        httpOnly: true,
      });

      return new Response(null, {
        status: 302,
        headers,
      });
    }

    return new Response("missing redirect_uri query parameter", {
      status: 400,
    });
  }

  private clearCookie(domain: string, path: string): Headers {
    const hs = new Headers();
    hs.set(nextAuthorizationHeader, "");
    deleteCookie(hs, this.typegraphName, { path, domain });
    return hs;
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
      return [{}, this.clearCookie(url.hostname, typegraphPath)];
    }

    try {
      const claims = await verifyJWT(token) as JWTClaims;
      if (!claims) {
        return [{}, this.clearCookie(url.hostname, typegraphPath)];
      }

      if (new Date().valueOf() / 1000 > claims.refreshAt) {
        const hs = await this.renewJWTCookie(
          client,
          claims.refreshToken,
          config.cookies_max_age_sec,
          url.hostname,
        );
        return [claims, hs];
      }

      return [claims, new Headers()];
    } catch (e) {
      logger.info(`invalid auth: ${e}`);
      return [{}, this.clearCookie(url.hostname, typegraphPath)];
    }
  }

  async getProfile(token: string): Promise<unknown> {
    if (!this.profileUrl) {
      return {};
    }

    const profile = await fetch(
      this.profileUrl,
      { headers: { authorization: `Bearer ${token}` } },
    );

    return await profile.json();
  }

  private async createJWT(token: Tokens, maxAge: number): Promise<string> {
    const payload: JWTClaims = {
      provider: this.authName,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken as string,
      refreshAt: Math.floor(
        new Date().valueOf() / 1000 +
          (token.expiresIn ?? config.cookies_min_refresh_sec),
      ),
    };
    return await signJWT(payload, maxAge);
  }

  private createHeaders(
    jwt: string,
    maxAge: number,
    hostname: string,
  ): Headers {
    const hs = new Headers();
    const name = this.typegraphName;
    setCookie(hs, {
      name,
      value: jwt,
      maxAge,
      domain: hostname,
      path: `/${name}`,
      secure: !config.debug,
      sameSite: "Lax",
      httpOnly: false, // jwt should be decodeable by the browser
    });
    hs.set(nextAuthorizationHeader, jwt);
    return hs;
  }

  private async renewJWTCookie(
    client: OAuth2Client,
    refreshToken: string,
    maxAge: number,
    hostname: string,
  ): Promise<Headers> {
    const token = await client.refreshToken.refresh(refreshToken);
    const jwt = await this.createJWT(token, maxAge);
    if (jwt) {
      return this.createHeaders(jwt, maxAge, hostname);
    }
    const hs = new Headers();
    const name = this.typegraphName;
    deleteCookie(hs, name);
    return hs;
  }
}
