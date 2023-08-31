// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { JSONValue } from "../utils.ts";

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
  return new Response(`bad request: ${message}`, {
    status: 400,
  });
};
export const notFound = () =>
  new Response("not found", {
    status: 404,
  });

export const methodNotAllowed = () =>
  new Response("method not allowed", {
    status: 405,
  });

export const serverError = () => {
  return new Response("ko", {
    status: 500,
  });
};
