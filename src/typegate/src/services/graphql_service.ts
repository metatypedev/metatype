// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../log.ts";
import { parse } from "graphql";
import type { Context, Info } from "../types.ts";
import type { RateLimit } from "../typegate/rate_limiter.ts";
import {
  type Operations,
  parseRequest,
} from "../transports/graphql/request_parser.ts";
import {
  findOperation,
  type FragmentDefs,
} from "../transports/graphql/graphql.ts";
import { forceAnyToOption } from "../utils.ts";
import type { QueryEngine } from "../engine/query_engine.ts";
import type * as ast from "graphql/ast";
import { BadContext, ResolverError } from "../errors.ts";
import { badRequest, jsonError, jsonOk } from "./responses.ts";
import { BaseError, ErrorKind } from "../errors.ts";

const logger = getLogger(import.meta);

class InvalidQuery extends BaseError {
  constructor(message: string) {
    super(import.meta, ErrorKind.User, message);
  }
}

class GraphQLVariableNotFound extends InvalidQuery {
  constructor(variable: string) {
    super(`variable not found: ${variable}`);
  }
}

export function isIntrospectionQuery(
  operation: ast.OperationDefinitionNode,
  _fragments: FragmentDefs,
) {
  return operation.name?.value === "IntrospectionQuery";
}

export async function handleGraphQL(
  request: Request,
  engine: QueryEngine,
  context: Context,
  info: Info,
  limit: RateLimit | null,
  headers: Headers,
): Promise<Response> {
  let content: Operations | null = null;
  try {
    content = await parseRequest(request);
  } catch (e) {
    if (e instanceof BaseError) {
      return e.toResponse(headers);
    }
    return badRequest(e.message);
  }
  const { query, operationName: operationNameRaw, variables } = content;
  const operationName = forceAnyToOption(operationNameRaw);

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
      GraphQLVariableNotFound,
    );

    const isIntrospection = isIntrospectionQuery(
      unwrappedOperation,
      fragments,
    );
    const verbose = !isIntrospection;

    if (verbose) {
      logger.info("op: {}", operationName);
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

    return jsonOk({ data: res, headers });
  } catch (e) {
    // throw e;
    if (e instanceof BaseError) {
      return e.toResponse(headers);
    }
    if (e instanceof ResolverError) {
      logger.error(`field err: ${e.message}`);
      return jsonError({ status: 502, message: e.message, headers });
    } else if (e instanceof BadContext) {
      logger.error(`context err: ${e.message}`);
      return jsonError({
        status: Object.keys(context).length === 0 ? 401 : 403,
        message: e.message,
        headers,
      });
    } else {
      logger.error(`request err: ${Deno.inspect(e)}`);
      if (e.cause) {
        logger.error(
          Deno.inspect(e.cause, { strAbbreviateSize: 1024, depth: 10 }),
        );
      }
      jsonError({ status: 400, message: e.message, headers });
    }
  }
}
