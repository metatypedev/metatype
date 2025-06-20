// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { jsonError, jsonOk } from "../../responses.ts";
import { clearCookie } from "../cookies.ts";
import type { RouteParams } from "./mod.ts";
import * as z from "zod";
import { sha256 } from "../../../crypto.ts";
import type { OAuth2Auth } from "../protocols/oauth2.ts";
import type { JSONValue } from "@metatype/typegate/utils.ts";

const logger = getLogger(import.meta);

const paramSchema = z.union([
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string(),
    code_verifier: z.string(),
    client_id: z.string(),
    redirect_uri: z.string(),
    scope: z.string().optional(),
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string(),
    scope: z.string().optional(),
  }),
]);

export async function token(params: RouteParams) {
  const { request, engine, headers } = params;
  const body = (await request.json()) as z.infer<typeof paramSchema>;
  const url = new URL(request.url);
  const resHeaders = clearCookie(url.hostname, engine.name, headers);
  const origin = request.headers.get("origin") ?? "";
  const redis = engine.tg.typegate.redis;

  if (!paramSchema.safeParse(body).success) {
    return jsonError({
      status: 400,
      message: "invalid request body",
      headers: resHeaders,
    });
  }

  if (!redis) {
    throw new Error("no redis connection");
  }

  try {
    if (body.grant_type === "authorization_code") {
      const rawData = await redis.get(`code:${body.code}`);

      if (!rawData) {
        return jsonError({
          status: 400,
          message: "invalid code",
          headers: resHeaders,
        });
      }

      const { state, profile, provider } = JSON.parse(rawData);
      const auth = engine.tg.auths.get(provider) as OAuth2Auth;
      const expectedChallenge = await sha256(body.code_verifier);

      if (!state.redirectUri.startsWith(origin)) {
        return jsonError({
          status: 400,
          message: "token request must share domain with redirect uri",
          headers: resHeaders,
        });
      }

      if (
        state.codeChallenge !== expectedChallenge ||
        body.client_id !== state.id ||
        body.redirect_uri !== state.redirectUri
      ) {
        return jsonError({
          status: 400,
          message: "parameters mistmatch",
          headers: resHeaders,
        });
      }

      if (!auth) {
        throw new Error(`provider not found: ${provider}`);
      }

      const token = await auth.createJWT(
        request,
        profile,
        state.scope?.split(" ") ?? [],
      );

      await redis.set(
        `refresh:${token.refresh_token}`,
        JSON.stringify({ profile, provider }),
        { ex: engine.tg.typegate.config.base.jwt_max_duration_sec },
      );
      await redis.del(`code:${body.code}`);
      resHeaders.set("content-type", "application/json");

      return jsonOk({ data: { ...token }, headers: resHeaders });
    }

    if (body.grant_type === "refresh_token") {
      const rawData = await redis.get(`refresh:${body.refresh_token}`);

      if (!rawData) {
        return jsonError({
          status: 401,
          message: "invalid refresh_token",
          headers: resHeaders,
        });
      }

      const { provider, profile } = JSON.parse(rawData) as {
        profile: Record<string, unknown>;
        provider: string;
      };
      const auth = engine.tg.auths.get(provider) as OAuth2Auth;

      if (!auth) {
        throw new Error(`provider not found: ${provider}`);
      }

      const newTokens = await auth.createJWT(
        request,
        profile,
        body.scope?.split(" ") ?? [],
      );

      await redis.set(`refresh:${newTokens.refresh_token}`, rawData, {
        ex: engine.tg.typegate.config.base.jwt_max_duration_sec,
      });
      await redis.del(`refresh:${body.refresh_token}`);

      return jsonOk({
        headers: resHeaders,
        data: newTokens as JSONValue,
      });
    }

    return jsonError({
      status: 401,
      message: "invalid grant_type",
      headers: resHeaders,
    });
  } catch (e) {
    logger.error(`token request failed ${e}`);
    return jsonError({
      status: 401,
      message: "not authorized",
      headers: resHeaders,
    });
  }
}
