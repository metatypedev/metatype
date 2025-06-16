// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { jsonError, jsonOk } from "../../responses.ts";
import { clearCookie, getEncryptedCookie } from "../cookies.ts";
import type { RouteParams } from "./mod.ts";
import * as z from "zod";
import { sha256 } from "../../../crypto.ts";
import { Tokens } from "oauth2_client";
import { OAuth2Auth } from "../protocols/oauth2.ts";

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

  try {
    if (body.grant_type === "authorization_code") {
      const { token, state, code } = await getEncryptedCookie(
        request.headers,
        engine.name,
        engine.tg.typegate.cryptoKeys,
      );

      const expectedChallenge = await sha256(body.code_verifier);

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

      if (!state.redirectUri.startsWith(origin)) {
        return jsonError({
          status: 400,
          message: "take request must share domain with redirect uri",
          headers: resHeaders,
        });
      }

      await engine.tg.typegate.redis?.rename(code, token.refresh_token);
      resHeaders.set("content-type", "application/json");

      return jsonOk({ data: { ...token }, headers: resHeaders });
    }

    if (body.grant_type === "refresh_token") {
      const data = await engine.tg.typegate.redis?.get(body.refresh_token);

      if (!data) {
        return jsonError({
          status: 401,
          message: "invalid refresh_token",
          headers: resHeaders,
        });
      }

      const tokens = JSON.parse(data) as Tokens & { provider: string };
      const auth = engine.tg.auths.get(tokens.provider) as OAuth2Auth;

      if (!auth) {
        throw new Error(`provider not found: ${tokens.provider}`);
      }

      const newTokens = await auth.createJWT(tokens, request);

      await engine.tg.typegate.redis?.del(body.refresh_token);
      await engine.tg.typegate.redis?.set(
        newTokens.refresh_token,
        JSON.stringify({
          ...newTokens,
          provider: tokens.provider,
        }),
      );

      return jsonOk({
        headers: resHeaders,
        data: newTokens,
      });
    }
  } catch (e) {
    logger.error(`take request failed ${e}`);
    return jsonError({
      status: 401,
      message: "not authorized",
      headers: resHeaders,
    });
  }
}
