// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { jsonError, jsonOk } from "../../responses.ts";
import { clearCookie, getEncryptedCookie } from "../cookies.ts";
import type { RouteParams } from "./mod.ts";

const logger = getLogger(import.meta);

export async function take(params: RouteParams) {
  const { request, engine, headers } = params;
  const url = new URL(request.url);
  const resHeaders = clearCookie(url.hostname, engine.name, headers);
  const origin = request.headers.get("origin") ?? "";
  try {
    const { token, redirectUri } = await getEncryptedCookie(
      request.headers,
      engine.name,
      engine.tg.typegate.cryptoKeys,
    );

    if (!redirectUri.startsWith(origin)) {
      return jsonError({
        status: 400,
        message: "take request must share domain with redirect uri",
        headers: resHeaders,
      });
    }
    resHeaders.set("content-type", "application/json");
    return jsonOk({ data: { token }, headers: resHeaders });
  } catch (e) {
    logger.info(`take request failed ${e}`);
    return jsonError({
      status: 401,
      message: "not authorized",
      headers: resHeaders,
    });
  }
}
