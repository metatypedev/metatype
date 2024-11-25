// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { QueryEngine } from "../engine/query_engine.ts";
import { BadContext, ResolverError } from "../errors.ts";
import { getLogger } from "../log.ts";
import type { RateLimit } from "../typegate/rate_limiter.ts";
import type { Context, Info } from "../types.ts";
import { handlePlaygroundRestAPI } from "./playground_service.ts";
import { globalConfig } from "../config.ts";
import { BaseError, ErrorKind } from "../errors.ts";

const logger = getLogger("rest");

type BadResponse = {
  message: string;
  locations: string[];
  path: string[];
  extensions: { timestamp: string };
};

export async function handleRest(
  req: Request,
  engine: QueryEngine,
  context: Context,
  info: Info,
  limit: RateLimit | null,
  headers: Headers,
): Promise<Response> {
  try {
    const queries = engine.rest[req.method];
    const url = new URL(req.url);

    const [, typegraphName, _rest, ...remainder] = url.pathname.split("/");
    const name = remainder.join("/");

    if (req.method === "GET" && globalConfig.debug) {
      if (name === "/" || !name) {
        return handlePlaygroundRestAPI(
          `Redoc ${typegraphName}`,
          `${url.origin}/${typegraphName}/rest/__schema`,
        );
      }

      if (name == "__schema") {
        logger.info(`rest: ${name} fetch openapi schema`);
        const res = buildOpenAPISpecFrom(url.origin, engine);
        headers.set("Content-Type", "application/json");
        return new Response(res, {
          status: 200,
          headers,
        });
      }
    } else if (name == "__schema") {
      throw new Error(
        `${url.pathname} does not support ${req.method} method`,
      );
    }

    const { plan, checkVariables } = queries[name] ?? [];
    if (!plan) {
      return new BaseError(
        import.meta,
        ErrorKind.User,
        `query not found: ${name}`,
        404,
      ).withType("NotFound")
        .toResponse(headers, false);
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
    plan.validator(res);

    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify(res), {
      status: 200,
      headers,
    });
  } catch (e) {
    headers.set("Content-Type", "application/json");
    if (e instanceof BaseError) {
      return e.toResponse(headers, false);
    }
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

export function buildOpenAPISpecFrom(
  baseUrl: string,
  engine: QueryEngine,
): string {
  // https://swagger.io/specification/
  // https://github.com/OAI/OpenAPI-Specification/blob/main/examples/v3.0/petstore.json
  const title = engine.tg.type(0).title;
  const spec = {
    openapi: "3.0.3",
    info: {
      title: title,
      license: { name: "MIT" },
      description: `Rest endpoints for typegraph "${title}"`,
      version: "1.0.0",
    },
    // list server objects
    servers: [{ url: baseUrl }],
    // available paths and operations for the API.
    paths: {} as Record<string, unknown>,
    // hold various schema for the document
    components: {} as Record<string, unknown>,
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
          timestamp: { type: "string" },
        },
      },
    },
  };

  spec.components = {
    schemas: {
      Error: errorSchema,
    },
  };

  const genericErrorResponse = (name: string, code: number) => ({
    description: {
      400: `Perform ${name}: Bad Request`,
      403: `Perform ${name}: Forbidden`,
      500: `Perform ${name}: Service unavailable`,
    }[code] ?? `Perform ${name}: FAILED`,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
      },
    },
  });

  // build paths
  for (const m of Object.keys(engine.rest)) {
    const queries = engine.rest[m];
    const method = m.toLowerCase();
    for (const name of Object.keys(queries)) {
      const { variables, endpointToSchema, refSchemas } = queries[name];
      const fn = endpointToSchema[name];

      // update refs in spec
      for (const [name, schema] of refSchemas.entries()) {
        (spec.components.schemas as any)[name] = schema;
      }

      const responses = {
        200: {
          description: `Perform ${name} OK`,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  [fn.fnName]: fn.outputSchema,
                },
              },
            },
          },
        },
        500: genericErrorResponse(name, 500),
        403: genericErrorResponse(name, 403),
        400: genericErrorResponse(name, 400),
      };

      const getRequestBody = () => {
        const body = {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {} as Record<string, unknown>,
              },
            },
          },
          required: true,
        };
        for (const variable of variables) {
          const schema = body.content["application/json"].schema;
          schema.properties[name] = variable.schema;
        }
        return body;
      };

      const getParameters = () => {
        return variables.map((v) => ({
          name: v.name,
          in: "query",
          required: true,
          schema: v.schema,
        }));
      };

      const path = `/${title}/rest/${name}`;
      spec.paths[path] = {
        [method]: {
          summary: `Perform ${name}`,
          operationId: [method, title, name].join("_").toLowerCase(),
          responses,
        },
      };
      if (method == "get") {
        (spec.paths[path] as any)[method]["parameters"] = getParameters();
      } else {
        (spec.paths[path] as any)[method]["requestBody"] = getRequestBody();
      }
    }
  }

  return JSON.stringify(spec, null, 2);
}
