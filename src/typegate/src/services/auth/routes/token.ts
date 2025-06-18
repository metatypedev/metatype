// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { jsonError, jsonOk } from "../../responses.ts";
import { clearCookie, getEncryptedCookie } from "../cookies.ts";
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
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string(),
  }),
]);

export async function token(params: RouteParams) {
  const { request, engine, headers } = params;
  const body = (await request.json()) as z.infer<typeof paramSchema>;
  const url = new URL(request.url);
  const resHeaders = clearCookie(url.hostname, engine.name, headers);
  const origin = request.headers.get("origin") ?? "";

  if (!paramSchema.safeParse(body).success) {
    return jsonError({
      status: 400,
      message: "invalid request body",
      headers: resHeaders,
    });
  }

  if (!engine.tg.typegate.redis) {
    throw new Error("no redis connection");
  }

  try {
    if (body.grant_type === "authorization_code") {
      const { token, state, code } = await getEncryptedCookie(
        request.headers,
        engine.name,
        engine.tg.typegate.cryptoKeys,
      );
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
        code !== body.code ||
        body.client_id !== state.id ||
        body.redirect_uri !== state.redirectUri
      ) {
        return jsonError({
          status: 400,
          message: "parameters mistmatch",
          headers: resHeaders,
        });
      }

      const cachedData = await engine.tg.typegate.redis?.get(
        `code:${body.code}`,
      );

      if (!cachedData) {
        return jsonError({
          status: 401,
          message: "code expired",
          headers: resHeaders,
        });
      }

      await engine.tg.typegate.redis.set(
        `refresh:${token.refresh_token}`,
        cachedData,
        { ex: engine.tg.typegate.config.base.jwt_max_duration_sec },
      );
      await engine.tg.typegate.redis.del(`code:${body.code}`);
      resHeaders.set("content-type", "application/json");

      return jsonOk({ data: { ...token }, headers: resHeaders });
    }

    if (body.grant_type === "refresh_token") {
      const rawData = await engine.tg.typegate.redis.get(
        `refresh:${body.refresh_token}`,
      );

      if (!rawData) {
        return jsonError({
          status: 401,
          message: "invalid refresh_token",
          headers: resHeaders,
        });
      }

      const cachedData = JSON.parse(rawData) as {
        profile: Record<string, unknown>;
        provider: string;
      };
      const auth = engine.tg.auths.get(cachedData.provider) as OAuth2Auth;

      if (!auth) {
        throw new Error(`provider not found: ${cachedData.provider}`);
      }

      const newTokens = await auth.createJWT(request, cachedData.profile);

      await engine.tg.typegate.redis.set(
        `refresh:${newTokens.refresh_token}`,
        rawData,
        { ex: engine.tg.typegate.config.base.jwt_max_duration_sec },
      );
      await engine.tg.typegate.redis.del(`refresh:${body.refresh_token}`);

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
