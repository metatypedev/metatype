// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { JSONValue } from "../utils.ts";
import { BaseError, ErrorKind } from "../errors.ts";

export type JsonOkConfig = {
  data: JSONValue;
  headers?: Headers | HeadersInit;
  status?: number;
  graphql?: boolean;
};

export const jsonOk = (
  { status = 200, data, headers: headersInit, graphql = true }: JsonOkConfig,
) => {
  const headers = headersInit != null
    ? new Headers(headersInit)
    : new Headers();
  headers.set("content-type", "application/json");
  const payload = graphql ? { data } : data;
  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
};

export type JsonErrorConfig = {
  status: number;
  message: string;
  headers?: Headers | HeadersInit;
};

export const jsonError = (
  { status, message, headers: headersInit }: JsonErrorConfig,
) => {
  const headers = headersInit != null
    ? new Headers(headersInit)
    : new Headers();
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
