// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../../log.ts";
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
      return new Response(
        "take request must share domain with redirect uri",
        {
          status: 400,
          headers: resHeaders,
        },
      );
    }
    resHeaders.set("content-type", "application/json");
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: resHeaders,
    });
  } catch (e) {
    logger.info(`take request failed ${e}`);
    return new Response("not authorized", {
      status: 401,
      headers: resHeaders,
    });
  }
}
