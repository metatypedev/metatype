// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../engine.ts";
import { BadContext, ResolverError } from "../errors.ts";
import { getLogger } from "../log.ts";
import { RateLimit } from "../rate_limiter.ts";
import { Context, Info } from "../types.ts";

const logger = getLogger("rest");

export async function handleRest(
  req: Request,
  engine: Engine,
  context: Context,
  info: Info,
  limit: RateLimit | null,
  headers: Headers,
): Promise<Response> {
  try {
    const queries = engine.rest[req.method];
    const url = new URL(req.url);

    const name = url.pathname.split("/").slice(
      3,
    ).join("/");
    const [plan, checkVariables] = queries[name] ?? [];
    if (!plan) {
      return new Response(`query not found: ${name}`, { status: 404 });
    }

    const variables = req.method === "GET"
      ? checkVariables(Object.fromEntries(url.searchParams.entries()))
      : await req.json();

    logger.info(`rest: ${name} with ${JSON.stringify(variables)}`);

    const res = await engine.computePlan(
      plan,
      variables,
      context,
      info,
      limit,
      true,
    );

    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify(res), {
      status: 200,
      headers,
    });
  } catch (e) {
    if (e instanceof ResolverError) {
      logger.error(`field err: ${e.message}`);
      return new Response(
        JSON.stringify({
          message: e.message,
          locations: [],
          path: [],
          extensions: { timestamp: new Date().toISOString() },
        }),
        {
          headers,
          status: 502,
        },
      );
    } else if (e instanceof BadContext) {
      logger.error(`context err: ${e.message}`);
      return new Response(
        JSON.stringify({
          message: e.message,
          locations: [],
          path: [],
          extensions: { timestamp: new Date().toISOString() },
        }),
        {
          headers,
          status: 403,
        },
      );
    } else {
      logger.error(`request err: ${e}`);
      return new Response(
        JSON.stringify({
          message: e.message,
          locations: [],
          path: [],
          extensions: { timestamp: new Date().toISOString() },
        }),
        {
          headers,
          status: 400,
        },
      );
    }
  }
}
