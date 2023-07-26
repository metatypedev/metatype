// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../log.ts";
import { parse } from "graphql";
import { Context, Info } from "../types.ts";
import { RateLimit } from "../typegate/rate_limiter.ts";
import { Operations, parseRequest } from "../graphql/request_parser.ts";
import { findOperation, FragmentDefs } from "../graphql.ts";
import { forceAnyToOption } from "../utils.ts";
import { Engine } from "../engine.ts";
import * as ast from "graphql/ast";
import { BadContext, ResolverError } from "../errors.ts";

const logger = getLogger("graphql");

export function isIntrospectionQuery(
  operation: ast.OperationDefinitionNode,
  _fragments: FragmentDefs,
) {
  return operation.name?.value === "IntrospectionQuery";
}

export async function handleGraphQL(
  request: Request,
  engine: Engine,
  context: Context,
  info: Info,
  limit: RateLimit | null,
  headers: Headers,
): Promise<Response> {
  let content: Operations | null = null;
  try {
    content = await parseRequest(request);
  } catch (e) {
    return new Response(`bad request: ${e.message}`, { status: 400 });
  }
  const { query, operationName: operationNameRaw, variables } = content;

  const operationName = forceAnyToOption(operationNameRaw);

  headers.set("content-type", "application/json");

  try {
    const document = parse(query);

    const [operation, fragments] = findOperation(document, operationName);
    if (operation.isNone()) {
      throw Error(`operation ${operationName.unwrapOr("<none>")} not found`);
    }
    const unwrappedOperation = operation.unwrap();

    engine.checkVariablesPresence(
      unwrappedOperation.variableDefinitions ?? [],
      variables,
    );

    const isIntrospection = isIntrospectionQuery(
      unwrappedOperation,
      fragments,
    );
    const verbose = !isIntrospection;

    if (verbose) {
      logger.info("———");
      logger.info("op:", operationName);
    }

    const startTime = performance.now();
    const [plan, cacheHit] = await engine.getPlan(
      unwrappedOperation,
      fragments,
      true,
      verbose,
    );
    const planTime = performance.now();

    //logger.info("dag:", stages);
    const res = await engine.computePlan(
      plan,
      variables,
      context,
      info,
      limit,
      verbose,
    );
    const computeTime = performance.now();

    if (verbose) {
      logger.info(
        `${cacheHit ? "fetched" : "planned"}  in ${
          (
            planTime - startTime
          ).toFixed(2)
        }ms`,
      );
      logger.info(
        `computed in ${(computeTime - planTime).toFixed(2)}ms`,
      );
    }

    if (engine.name !== "typegate" && !isIntrospection) {
      logger.debug({ req: { query, operationName, variables }, res });
    }

    return new Response(JSON.stringify({ data: res }), {
      headers,
      status: 200,
    });
  } catch (e) {
    if (e instanceof ResolverError) {
      logger.error(`field err: ${e.message}`);
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: e.message,
              locations: [],
              path: [],
              extensions: { timestamp: new Date().toISOString() },
            },
          ],
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
          errors: [
            {
              message: e.message,
              locations: [],
              path: [],
              extensions: { timestamp: new Date().toISOString() },
            },
          ],
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
          errors: [
            {
              message: e.message,
              locations: [],
              path: [],
              extensions: { timestamp: new Date().toISOString() },
            },
          ],
        }),
        {
          headers,
          status: 400,
        },
      );
    }
  }
}
