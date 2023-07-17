// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../engine.ts";
import { BadContext, ResolverError } from "../errors.ts";
import { getLogger } from "../log.ts";
import { RateLimit } from "../rate_limiter.ts";
import { Context, Info } from "../types.ts";

const logger = getLogger("rest");

type BadResponse = {
  message: string;
  locations: string[];
  path: string[];
  extensions: { timestamp: string };
};

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

    const json = buildOpenAPISpecFrom(url.origin, engine);
    console.log("SPEC", json);

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
        } as BadResponse),
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
        } as BadResponse),
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
        } as BadResponse),
        {
          headers,
          status: 400,
        },
      );
    }
  }
}

export function buildOpenAPISpecFrom(baseUrl: string, engine: Engine): string {
  // https://swagger.io/specification/
  // https://github.com/OAI/OpenAPI-Specification/blob/main/examples/v3.0/petstore.json
  const title = engine.tg.type(0).title;
  const spec = {
    openapi: "3.0.0",
    infos: {
      title: title,
      license: { name: "MIT" },
      description: `Rest endpoint for typegraph "${title}"`,
      version: "1.0.0",
    },
    // list server objects
    servers: [{ url: baseUrl }],
    // available paths and operations for the API.
    paths: {} as Record<string, unknown>,
    // hold various schema for the document
    components: {},
    // declare which security mechanisms can be used across the API
    security: {} as Record<string, unknown>,
  };

  // 502, 400, 403
  const errorSchema = {
    type: "object",
    required: ["message", "extensions"],
    properties: {
      message: { type: "integer" },
      locations: { type: "array", items: { type: "string" } },
      path: { type: "array", items: { type: "string" } },
      extensions: {
        type: "object",
        properties: {
          timestamp: "string",
        },
      },
    },
  };

  spec.components = {
    schemas: {
      Error: errorSchema,
      GraphQLOutput: {},
    },
  };

  const genericErrorResponse = (name: string) => ({
    description: `Perform ${name} FAILED`,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
      },
    },
  });

  // construct paths
  for (const method of Object.keys(engine.rest)) {
    const queries = engine.rest[method];
    for (const name of Object.keys(queries)) {
      const [, , getVariables] = queries[name];

      const parameters = getVariables().map((v) => ({
        name: v,
        required: true,
      }));

      spec.paths[`/rest/${title}/${name}`] = {
        [method]: {
          summary: `Perform ${name}`,
          operationId: [method, title, name].join("_").toLowerCase(),
          parameters,
          responses: {
            200: {
              description: `Perform ${name} OK`,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GraphQLOutput" },
                },
              },
            },
            500: genericErrorResponse(name),
            403: genericErrorResponse(name),
            400: genericErrorResponse(name),
          },
        },
      };
    }
  }
  return JSON.stringify(spec, null, 2);
}
