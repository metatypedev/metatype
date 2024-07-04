// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { JSONValue } from "../utils.ts";
import { BaseError, ErrorKind } from "../errors.ts";

export const jsonOk = (data: JSONValue, headers: Headers) => {
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers,
  });
};

export const jsonError = (
  message: string,
  headers: Headers,
  status: number,
) => {
  headers.set("content-type", "application/json");
  return new Response(
    JSON.stringify({
      errors: [
        {
          message,
          locations: [],
          path: [],
          extensions: { timestamp: new Date().toISOString() },
        },
      ],
    }),
    {
      headers,
      status,
    },
  );
};

export const badRequest = (message: string) => {
  return new BaseError(null, ErrorKind.User, message)
    .withType("BadRequest")
    .toResponse();
};
export const notFound = (message = "not found") =>
  new BaseError(null, ErrorKind.User, message, 404)
    .withType("NotFound")
    .toResponse();

export const methodNotAllowed = () =>
  new BaseError(null, ErrorKind.User, "method not allowed", 405)
    .withType("MethodNotAllowed")
    .toResponse();

export const serverError = () => {
  return new BaseError(null, ErrorKind.Service, "internal server error")
    .withType("ServerError")
    .toResponse();
};
