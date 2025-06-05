// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { TypegateConfigBase } from "../../../config.ts";
import {
  OAuth2Client,
  type OAuth2ClientConfig,
  type Tokens,
} from "oauth2_client";
import { randomUUID, type TypegateCryptoKeys } from "../../../crypto.ts";
import type { AdditionalAuthParams, JWTClaims } from "../mod.ts";
import { getLogger } from "../../../log.ts";
import type { SecretManager } from "../../../typegraph/mod.ts";
import {
  clearCookie,
  getEncryptedCookie,
  setEncryptedSessionCookie,
} from "../cookies.ts";
import { Protocol } from "./protocol.ts";
import type { Auth } from "../../../typegraph/types.ts";
import { Type } from "../../../typegraph/type_node.ts";
import { ComputeStage } from "../../../engine/query_engine.ts";
import * as ast from "graphql/ast";
import {
  generateValidator,
  generateWeakValidator,
} from "../../../engine/typecheck/input.ts";
import type { TokenMiddlewareOutput } from "./protocol.ts";
import { jsonError } from "../../responses.ts";

const logger = getLogger(import.meta);

class AuthProfiler {
  constructor(
    private authParameters: AdditionalAuthParams,
    private funcIndex: number,
  ) {}

  private getComputeStage(): ComputeStage {
    const { tg, runtimeReferences } = this.authParameters;
    const funcNode = tg.type(this.funcIndex, Type.FUNCTION);
    const mat = tg.materializer(funcNode.materializer);
    const runtime = runtimeReferences[mat.runtime];

    return new ComputeStage({
      operationName: "",
      dependencies: [],
      args: (x: any) => x,
      operationType: ast.OperationTypeNode.QUERY,
      outType: tg.type(funcNode.output),
      typeIdx: funcNode.input,
      runtime: runtime,
      materializer: mat,
      node: "",
      path: [],
      batcher: (x) => x,
      rateCalls: false,
      rateWeight: 0,
      effect: null,
    });
  }

  async transform(profile: any, request: Request) {
    const { tg, runtimeReferences } = this.authParameters;
    const funcNode = tg.type(this.funcIndex, Type.FUNCTION);
    const mat = tg.materializer(funcNode.materializer);
    const runtime = runtimeReferences[mat.runtime];
    const validatorInputWeak = generateWeakValidator(tg, funcNode.input);
    const validatorOutput = generateValidator(tg, funcNode.output);

    const input = {
      ...profile,
      _: {
        info: {
          url: new URL(request.url),
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
    };
    validatorInputWeak(input);

    // Note: this assumes func is a simple t.func(inp, out, mat)
    const stages = await runtime.materialize(this.getComputeStage(), [], true);
    const resolver = stages.pop()?.props.resolver;
    if (typeof resolver != "function") {
      throw Error(
        `invalid resolver, function was expected but got ${typeof resolver} instead`,
      );
    }

    const ret = await resolver(input);
    validatorOutput(ret);

    return ret;
  }
}

export type Oauth2AuthConfig = Pick<
  TypegateConfigBase,
  "jwt_max_duration_sec" | "jwt_refresh_duration_sec"
>;

export type Oauth2Client = {
  id: string;
  redirect_uri: string;
};

export class OAuth2Auth extends Protocol {
  static init(
    typegraphName: string,
    auth: Auth,
    secretManager: SecretManager,
    authParameters: AdditionalAuthParams,
  ): Promise<Protocol> {
    const authName = auth.name.toUpperCase();
    const clientId = secretManager.secretOrFail(`${authName}_CLIENT_ID`);
    const clientSecret = secretManager.secretOrFail(
      `${authName}_CLIENT_SECRET`,
    );
    const {
      authorize_url,
      access_url,
      scopes,
      profile_url,
      profiler,
      clients,
    } = auth.auth_data;
    const clientData = {
      clientId,
      clientSecret,
      authorizationEndpointUri: authorize_url as string,
      tokenUri: access_url as string,
      defaults: {
        scope: scopes as string,
      },
    };

    const { jwt_max_duration_sec, jwt_refresh_duration_sec } =
      authParameters.tg.typegate.config.base;
    const config = { jwt_max_duration_sec, jwt_refresh_duration_sec };

    return Promise.resolve(
      new OAuth2Auth(
        typegraphName,
        auth.name,
        clientData,
        profile_url as string | null,
        profiler !== undefined
          ? new AuthProfiler(authParameters, profiler as number)
          : null,
        authParameters.tg.typegate.cryptoKeys,
        clients as Oauth2Client[],
        config,
      ),
    );
  }

  private constructor(
    typegraphName: string,
    private authName: string,
    private clientData: Omit<OAuth2ClientConfig, "redirectUri">,
    private profileUrl: string | null,
    private authProfiler: AuthProfiler | null,
    private cryptoKeys: TypegateCryptoKeys,
    private clients: Oauth2Client[],
    private config: Oauth2AuthConfig,
  ) {
    super(typegraphName);
  }

  override async authMiddleware(request: Request): Promise<Response> {
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
            this.cryptoKeys,
          );
        const tokens = await client.code.getToken(url, { state, codeVerifier });
        const token = await this.createJWT(tokens, request);
        const headers = await setEncryptedSessionCookie(
          url.hostname,
          this.typegraphName,
          { token, redirectUri: userRedirectUri },
          this.cryptoKeys,
        );
        headers.set("location", userRedirectUri as string);
        return new Response(null, {
          status: 302,
          headers,
        });
      } catch (e) {
        logger.warn(e);
        const headers = clearCookie(
          url.hostname,
          this.typegraphName,
          new Headers(),
        );
        // https://github.com/cmd-johnson/deno-oauth2-client/issues/25
        return jsonError({
          message: `invalid oauth2, check your credentials: ${e}`,
          headers,
          status: 400,
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
        this.cryptoKeys,
      );
      headers.set("location", uri.toString());
      return new Response(null, {
        status: 302,
        headers,
      });
    }

    return jsonError({
      message: "missing origin or redirect_uri query parameter",
      status: 400,
    });
  }

  async tokenMiddleware(
    token: string,
    request: Request,
  ): Promise<TokenMiddlewareOutput> {
    const url = new URL(request.url);
    const typegraphPath = `/${this.typegraphName}`;
    const client = new OAuth2Client({
      ...this.clientData,
      redirectUri: `${url.protocol}//${url.host}${typegraphPath}/auth/${this.authName}`,
    });

    if (!token) {
      return {
        claims: {},
        nextToken: null,
        error: "missing token",
      };
    }
    let jwt: JWTClaims;
    try {
      jwt = (await this.cryptoKeys.verifyJWT(token)) as JWTClaims;
    } catch (e) {
      return {
        claims: {},
        nextToken: "", // clear
        error: `invalid token: ${e}`,
      };
    }

    const { refreshToken, ...claims } = jwt;
    if (isJwtExpired(jwt)) {
      let newClaims: Tokens;
      try {
        newClaims = await client.refreshToken.refresh(refreshToken);
      } catch (e) {
        logger.error("XXX error refreshing oauth token {}", {
          err: e,
          clientData: this.clientData,
        });
        return {
          claims: {},
          nextToken: "", // clear
          error: `could not refresh expired token: ${e}`,
        };
      }
      const token = await this.createJWT(newClaims, request);
      return {
        claims,
        nextToken: token, // update
        error: null,
      };
    }

    return {
      claims,
      nextToken: null, // keep
      error: null,
    };
  }

  private async getProfile(
    token: Tokens,
    request: Request,
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
          Accept: "application/json",
          authorization: `${token.tokenType} ${token.accessToken}`,
        },
      });
      let profile = await res.json();

      if (this.authProfiler) {
        profile = await this.authProfiler!.transform(profile, request);
      }

      return profile;
    } catch (e) {
      throw new Error(`failed to fetch profile: ${e}`);
    }
  }

  private async createJWT(token: Tokens, request: Request): Promise<string> {
    const profile = await this.getProfile(token, request);
    const payload: JWTClaims = {
      provider: this.authName,
      accessToken: token.accessToken,
      refreshToken: await this.cryptoKeys.encrypt(token.refreshToken as string),
      refreshAt: Math.floor(
        new Date().valueOf() / 1000 +
          (token.expiresIn ?? this.config.jwt_refresh_duration_sec),
      ),
      scope: token.scope,
      profile,
    };
    return await this.cryptoKeys.signJWT(
      payload,
      this.config.jwt_max_duration_sec,
    );
  }
}

function isJwtExpired(jwt: JWTClaims): boolean {
  return new Date().valueOf() / 1000 > jwt.refreshAt;
}
