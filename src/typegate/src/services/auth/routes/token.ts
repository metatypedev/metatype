// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { encodeBase64Url } from "@std/encoding/base64url";
import { getLogger } from "../../../log.ts";
import { jsonError, jsonOk } from "../../responses.ts";
import { clearCookie, getEncryptedCookie } from "../cookies.ts";
import type { RouteParams } from "./mod.ts";
import * as z from "zod";
import { sha256 } from "../../../crypto.ts";

const logger = getLogger(import.meta);

const paramSchema = z.object({
  code: z.string(),
  code_verifier: z.string(),
});

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
    const { token, state, code } = await getEncryptedCookie(
      request.headers,
      engine.name,
      engine.tg.typegate.cryptoKeys,
    );

    const expectedChallenge = encodeBase64Url(await sha256(body.code_verifier));

    logger.info(`Code verifier: ${body.code_verifier}`);
    logger.info(`Expected challenge: ${expectedChallenge}`);
    logger.info(`Actual challenge: ${state.codeChallenge}`);

    if (state.codeChallenge !== expectedChallenge || code !== body.code) {
      return jsonError({
        status: 400,
        message: "invalid parameters",
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
    resHeaders.set("content-type", "application/json");
    return jsonOk({ data: { token }, headers: resHeaders });
  } catch (e) {
    logger.error(`take request failed ${e}`);
    return jsonError({
      status: 401,
      message: "not authorized",
      headers: resHeaders,
    });
  }
}
