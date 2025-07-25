// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// CopyrightjMetatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { TypegateConfigBase } from "../../../config.ts";
import {
  OAuth2Client,
  type OAuth2ClientConfig,
  type Tokens,
} from "oauth2_client";
// deno-lint-ignore no-external-import
import { randomBytes } from "node:crypto";
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
import {
  ComputeStage,
  type QueryEngine,
} from "../../../engine/query_engine.ts";
import * as ast from "graphql/ast";
import {
  generateValidator,
  generateWeakValidator,
} from "../../../engine/typecheck/input.ts";
import type { TokenMiddlewareOutput } from "./protocol.ts";
import { jsonError } from "../../responses.ts";
import * as z from "zod";

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

  async transform(request: Request, profile?: any, scope?: string) {
    const { tg, runtimeReferences } = this.authParameters;
    const funcNode = tg.type(this.funcIndex, Type.FUNCTION);
    const mat = tg.materializer(funcNode.materializer);
    const runtime = runtimeReferences[mat.runtime];
    const validatorInputWeak = generateWeakValidator(tg, funcNode.input);
    const validatorOutput = generateValidator(tg, funcNode.output);

    const input = {
      ...(profile ?? {}),
      _: {
        scope: scope?.split(" "),
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
  id_secret: string;
  redirect_uri_secret: string;
};

const oauthQuerySchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  state: z.string(),
  code_challenge: z.string(),
  code_challenge_method: z.literal("S256"),
});

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
    const providerData = {
      clientId,
      clientSecret,
      authorizationEndpointUri: authorize_url as string,
      tokenUri: access_url as string,
      defaults: {
        scope: scopes as string,
      },
    };

    const clientsMap = new Map(
      (clients as Oauth2Client[]).map(
        ({ id_secret: id, redirect_uri_secret: redirect_uri }) => [
          secretManager.secretOrFail(id),
          secretManager.secretOrFail(redirect_uri),
        ],
      ),
    );

    if (clientsMap.size === 0) {
      throw new Error("At least one OAuth2 client must be configured");
    }

    const { jwt_max_duration_sec, jwt_refresh_duration_sec } =
      authParameters.tg.typegate.config.base;
    const config = { jwt_max_duration_sec, jwt_refresh_duration_sec };

    return Promise.resolve(
      new OAuth2Auth(
        typegraphName,
        auth.name,
        providerData,
        profile_url as string | null,
        profiler !== undefined
          ? new AuthProfiler(authParameters, profiler as number)
          : null,
        authParameters.tg.typegate.cryptoKeys,
        clientsMap,
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
    private clientsMap: Map<string, string>,
    private config: Oauth2AuthConfig,
  ) {
    super(typegraphName);
  }

  override async authMiddleware(
    request: Request,
    engine: QueryEngine,
  ): Promise<Response> {
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    const typegraphPath = `/${this.typegraphName}`;
    const loginPath = `${typegraphPath}/auth/${this.authName}`;
    const client = new OAuth2Client({
      ...this.clientData,
      redirectUri: `${base}${loginPath}`,
    });
    const query = Object.fromEntries(url.searchParams.entries());

    // callback;
    if (query.code && query.state) {
      try {
        const state = await getEncryptedCookie(
          request.headers,
          this.typegraphName,
          this.cryptoKeys,
        );
        const tokens = await client.code.getToken(url, {
          state: state.provider.state,
          codeVerifier: state.provider.codeVerifier,
        });
        const profile = await this.fetchProfile(tokens);
        const code = randomBytes(32).toString("base64url");
        const redirectUri = new URL(state.client.redirectUri);

        const payload = {
          profile,
          provider: this.authName,
          state: state.client,
        };

        await engine.tg.typegate.redis?.set(
          `code:${code}`,
          JSON.stringify(payload),
          { ex: 600 }, // 10 minutes
        );

        redirectUri.searchParams.append("code", code);
        redirectUri.searchParams.append("state", state.client.state);

        const headers = new Headers();

        headers.set("location", redirectUri.toString());

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
    try {
      oauthQuerySchema.parse(query);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const messages = err.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`,
        );
        return jsonError({ message: messages.join(", "), status: 400 });
      }
    }

    const userRedirectUri = this.clientsMap.get(query.client_id);

    if (query.redirect_uri !== userRedirectUri) {
      return jsonError({
        message: "invalid redirect_uri parameter",
        status: 400,
      });
    }

    const state = randomUUID();
    const { codeVerifier, uri } = await client.code.getAuthorizationUri({
      state,
    });
    const loginState = {
      provider: {
        state,
        codeVerifier,
      },
      client: {
        id: query.client_id,
        state: query.state,
        redirectUri: query.redirect_uri,
        codeChallenge: query.code_challenge,
        method: query.code_challenge_method,
      },
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

  async tokenMiddleware(
    token: string,
    _request: Request,
  ): Promise<TokenMiddlewareOutput> {
    // const url = new URL(request.url);
    // const typegraphPath = `/${this.typegraphName}`;
    // const client = new OAuth2Client({
    //   ...this.clientData,
    //   redirectUri: `${url.protocol}//${url.host}${typegraphPath}/auth/${this.authName}`,
    // });

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

    const { ...claims } = jwt;
    if (isJwtExpired(jwt)) {
      return {
        claims,
        nextToken: "",
        error: "access token expired",
      };
    }

    return {
      claims,
      nextToken: null, // keep
      error: null,
    };
  }

  private async fetchProfile(token: Tokens) {
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

      return res.json();
    } catch (e) {
      throw new Error(`failed to fetch profile: ${e}`);
    }
  }

  async createJWT(
    request: Request,
    profile?: Record<string, unknown>,
    scope?: string,
  ) {
    if (this.authProfiler) {
      profile = await this.authProfiler!.transform(request, profile, scope);
    }

    const payload = {
      provider: this.authName,
      profile,
    };
    const access_token = await this.cryptoKeys.signJWT(
      payload,
      this.config.jwt_max_duration_sec,
    );
    const refresh_token = randomBytes(32).toString("base64url");

    return {
      token_type: "Bearer",
      access_token,
      refresh_token,
      expires_in: this.config.jwt_max_duration_sec,
      scope: scope ?? null,
    };
  }
}

function isJwtExpired(jwt: JWTClaims): boolean {
  return new Date().valueOf() / 1000 > jwt.exp;
}
