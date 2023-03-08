// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Auth, AuthDS, nextAuthorizationHeader } from "../auth.ts";
import config from "../../config.ts";
import { deleteCookie, setCookie } from "std/http/cookie.ts";
import { OAuth2Client, OAuth2ClientConfig, Tokens } from "oauth2_client";
import { signJWT, verifyJWT } from "../../crypto.ts";
import { envOrFail } from "../../utils.ts";
import { JWTClaims } from "../auth.ts";

export class OAuth2Auth implements Auth {
  static init(typegraphName: string, auth: AuthDS): Promise<Auth> {
    const clientId = envOrFail(typegraphName, `${auth.name}_CLIENT_ID`);
    const clientSecret = envOrFail(
      typegraphName,
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
    const client = new OAuth2Client({
      ...this.clientData,
      redirectUri:
        `${url.protocol}//${url.host}/${this.typegraphName}/auth/${this.authName}`,
    });
    const query = Object.fromEntries(url.searchParams.entries());

    if (query.code && query.state) {
      try {
        const { redirectUri } = await verifyJWT(query.state);

        const token = await client.code.getToken(url);
        const jwt = await this.createJWT(token, config.cookies_max_age_sec);
        const headers = this.createHeaders(
          jwt,
          config.cookies_max_age_sec,
          url.host,
        );

        headers.set("location", redirectUri as string);
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

    const state = await signJWT({ redirectUri: query.redirect_uri }, 3600);
    const location = client.code.getAuthorizationUri({ state }).toString();

    return new Response(null, {
      status: 302,
      headers: {
        location,
      },
    });
  }

  async tokenMiddleware(
    token: string,
    url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    const client = new OAuth2Client({
      ...this.clientData,
      redirectUri:
        `${url.protocol}//${url.host}/${this.typegraphName}/auth/${this.authName}`,
    });

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
          client,
          claims.refreshToken,
          config.cookies_max_age_sec,
          url.host,
        );
        return [claims, hs];
      }

      return [claims, new Headers()];
    } catch (e) {
      console.info(`invalid auth: ${e}`);
      return [{}, clearCookie()];
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
    host: string,
  ): Headers {
    const hs = new Headers();
    const name = this.typegraphName;
    setCookie(hs, {
      name,
      value: jwt,
      maxAge,
      domain: host,
      path: `/${name}`,
      secure: !config.debug,
      sameSite: "Lax",
    });
    hs.set(nextAuthorizationHeader, jwt);
    return hs;
  }

  private async renewJWTCookie(
    client: OAuth2Client,
    refreshToken: string,
    maxAge: number,
    host: string,
  ): Promise<Headers> {
    const token = await client.refreshToken.refresh(refreshToken);
    const jwt = await this.createJWT(token, maxAge);
    if (jwt) {
      return this.createHeaders(jwt, maxAge, host);
    }
    const hs = new Headers();
    const name = this.typegraphName;
    deleteCookie(hs, name);
    return hs;
  }
}
