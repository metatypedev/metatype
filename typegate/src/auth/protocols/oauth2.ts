// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth, AuthDS, nextAuthorizationHeader } from "../auth.ts";
import config from "../../config.ts";
import { deleteCookie, setCookie } from "std/http/cookie.ts";
import { OAuth2Client, Tokens } from "oauth2_client";
import { signJWT, verifyJWT } from "../../crypto.ts";
import { envOrFail } from "../../utils.ts";
import { JWTClaims } from "./jwt.ts";

export class OAuth2Auth implements Auth {
  static init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    const clientId = envOrFail(typegraphName, `${auth.name}_CLIENT_ID`);
    const clientSecret = envOrFail(
      typegraphName,
      `${auth.name}_CLIENT_SECRET`,
    );
    const { authorize_url, access_url, scopes, profile_url } = auth.auth_data;
    const client = new OAuth2Client({
      clientId,
      clientSecret,
      authorizationEndpointUri: authorize_url as string,
      tokenUri: access_url as string,
      redirectUri:
        `${config.tg_external_url}/${typegraphName}/auth/${auth.name}`,
      defaults: {
        scope: scopes as string,
      },
    });
    return Promise.resolve(
      new OAuth2Auth(
        typegraphName,
        auth,
        client,
        profile_url as string,
      ),
    );
  }

  private constructor(
    public typegraphName: string,
    public auth: AuthDS,
    private client: OAuth2Client,
    private profileUrl: string,
  ) {}

  async authMiddleware(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());

    if (query.code && query.state) {
      try {
        const redirectUri = await this.verifyState(query.state);
        const headers = await this.createJWTHeaders(
          url,
          config.cookies_max_age_sec,
        );
        headers.set("location", redirectUri);
        return new Response(null, {
          status: 302,
          headers,
        });
      } catch (e) {
        console.info(e);
        return new Response(`invalid oauth2: ${e}`, {
          status: 400,
        });
      }
    }

    if (!query.redirect_uri) {
      return new Response("missing redirect_uri query parameter", {
        status: 400,
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        location: await this.getAuthorizationUri(query.redirect_uri),
      },
    });
  }

  async tokenMiddleware(
    token: string,
  ): Promise<[Record<string, unknown>, Headers]> {
    const clearCookie = (): Headers => {
      const hs = new Headers();
      hs.set(nextAuthorizationHeader, "");
      if (token) {
        deleteCookie(hs, this.typegraphName);
      }
      return hs;
    };

    if (!token) {
      return [{}, clearCookie()];
    }

    try {
      const claims = await verifyJWT(token) as JWTClaims;
      if (!claims) {
        return [{}, clearCookie()];
      }

      if (new Date().valueOf() / 1000 > claims.refreshAt) {
        const hs = await this.renewJWTCookie(
          claims.refreshToken,
          config.cookies_max_age_sec,
        );
        return [claims, hs];
      }

      return [claims, new Headers()];
    } catch (e) {
      console.info(`invalid auth: ${e}`);
      return [{}, clearCookie()];
    }
  }

  private async getAuthorizationUri(redirectUri: string): Promise<string> {
    const state = await signJWT({ redirectUri }, 3600);
    return this.client.code.getAuthorizationUri({ state }).toString();
  }

  private async getToken(url: URL): Promise<Tokens> {
    return await this.client.code.getToken(url);
  }

  private async verifyState(state: string): Promise<string> {
    const payload = await verifyJWT(state);
    return payload.redirectUri as string;
  }

  private async refreshToken(refreshToken: string): Promise<Tokens> {
    return await this.client.refreshToken.refresh(refreshToken);
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
      provider: this.auth.name,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken as string,
      refreshAt: Math.floor(
        new Date().valueOf() / 1000 +
          (token.expiresIn ?? config.cookies_min_refresh_sec),
      ),
    };
    return await signJWT(payload, maxAge);
  }

  private createHeaders(jwt: string, maxAge: number): Headers {
    const hs = new Headers();
    const name = this.typegraphName;
    setCookie(hs, {
      name,
      value: jwt,
      maxAge,
      domain: new URL(config.tg_external_url).hostname,
      path: `/${name}`,
      secure: !config.debug,
      sameSite: "Lax",
    });
    hs.set(nextAuthorizationHeader, jwt);
    return hs;
  }

  private async createJWTHeaders(
    urlWithToken: URL,
    maxAge: number,
  ): Promise<Headers> {
    const token = await this.getToken(urlWithToken);
    const jwt = await this.createJWT(token, maxAge);
    return this.createHeaders(jwt, maxAge);
  }

  private async renewJWT(
    refreshToken: string,
    maxAge: number,
  ): Promise<string | null> {
    const token = await this.refreshToken(refreshToken);
    return await this.createJWT(token, maxAge);
  }

  private async renewJWTCookie(
    refreshToken: string,
    maxAge: number,
  ): Promise<Headers> {
    const jwt = await this.renewJWT(refreshToken, maxAge);
    if (jwt) {
      return this.createHeaders(jwt, maxAge);
    }
    const hs = new Headers();
    const name = this.typegraphName;
    deleteCookie(hs, name);
    return hs;
  }
}
