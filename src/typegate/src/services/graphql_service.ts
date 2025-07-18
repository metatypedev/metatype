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
import {
  type CachedResponse,
  computeRequestSignature,
  forceAnyToOption,
  toResponse,
  toSerializableResponse,
} from "../utils.ts";
import type { QueryEngine } from "../engine/query_engine.ts";
import type * as ast from "graphql/ast";
import { BadContext, ResolverError } from "../errors.ts";
import { badRequest, jsonError, jsonOk } from "./responses.ts";
import { BaseError, ErrorKind } from "../errors.ts";
import type { Register } from "@metatype/typegate/typegate/register.ts";

const logger = getLogger(import.meta);
const IDEMPOTENCY_HEADER = "Idempotency-Key";

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

export async function handleGraphQLHelper(
  content: Operations,
  engine: QueryEngine,
  context: Context,
  info: Info,
  limit: RateLimit | null,
  headers: Headers,
): Promise<Response> {
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
      logger.debug(
        `${cacheHit ? "fetched plan from cache" : "generated plan"} in ${
          (
            planTime - startTime
          ).toFixed(2)
        }ms, computed in ${(computeTime - planTime).toFixed(2)}ms`,
      );
    }

    return jsonOk({ data: { data: res }, headers });
  } catch (err: any) {
    if (err instanceof BaseError) {
      return err.toResponse(headers);
    }
    if (err instanceof ResolverError) {
      logger.error(`field err: ${err.message}`);
      return jsonError({ status: 502, message: err.message, headers });
    } else if (err instanceof BadContext) {
      logger.error(`context err: ${err.message}`);
      return jsonError({
        status: Object.keys(context).length === 0 ? 401 : 403,
        message: err.message,
        headers,
      });
    } else {
      logger.error(
        `request err`,
        err,
        err.cause ? { cause: err.cause } : undefined,
      );
      return jsonError({ status: 400, message: err.message, headers });
    }
  }
}

export async function handleGraphQL(
  register: Register,
  request: Request,
  engine: QueryEngine,
  context: Context,
  info: Info,
  limit: RateLimit | null,
  headers: Headers,
): Promise<Response> {
  const key = request.headers.get(IDEMPOTENCY_HEADER);
  let content: Operations | null = null;
  try {
    content = await parseRequest(key ? request.clone() : request);
  } catch (err: any) {
    if (err instanceof BaseError) {
      return err.toResponse(headers);
    }
    return badRequest(err.message);
  }

  if (key) {
    if (key.length > 255) {
      return jsonError({
        status: 422,
        message:
          `'${IDEMPOTENCY_HEADER}' value should not exceed 255 characters`,
        headers,
      });
    }

    const userRequestHash = await computeRequestSignature(request, [
      IDEMPOTENCY_HEADER,
    ]);
    const now = Date.now();
    const memoized = await register.getResponse(key);

    if (memoized) {
      const { response, expiryMillis, requestHash: savedHash } = memoized;

      if (now < expiryMillis) {
        if (userRequestHash != savedHash) {
          return jsonError({
            status: 422,
            message:
              `The request associated with key "${key}" has changed. Please use a new key or ensure the request matches the original.`,
            headers,
          });
        }

        logger.debug(`Idempotent request key "${key}" replayed`);
        return toResponse(response);
      } else {
        await register.deleteResponse(key);
      }
    }

    const response = await handleGraphQLHelper(
      content,
      engine,
      context,
      info,
      limit,
      headers,
    );

    const oneDay = 24 * 3600 * 1000;
    const expiryMillis = now + oneDay;
    await register.addResponse(
      key,
      {
        response: await toSerializableResponse(response.clone()),
        expiryMillis,
        requestHash: userRequestHash,
      } satisfies CachedResponse,
    );

    logger.warn(`Idempotent request key "${key}" renewed`);
    return response;
  }

  return await handleGraphQLHelper(
    content,
    engine,
    context,
    info,
    limit,
    headers,
  );
}
