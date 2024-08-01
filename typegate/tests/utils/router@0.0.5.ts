// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// Copyright 2021 denosaurs. All rights reserved. MIT license.

/**
 * A deno deploy compatible request handler which can be either sync or async
 * and gets passed the `Request`, it then eventually returns a `Response`
 */
export type RequestHandler = (req: Request) => Response | Promise<Response>;

/**
 * A handler type for anytime the `MatchHandler` or `other` parameter handler
 * fails
 */
export type ErrorHandler = (
  req: Request,
  err: unknown,
) => Response | Promise<Response>;

/**
 * A handler type for anytime a method is received that is not defined
 */
export type UnknownMethodHandler = (
  req: Request,
  knownMethods: string[],
) => Response | Promise<Response>;

/**
 * A handler type for a router path match which gets passed the matched values
 */
export type MatchHandler = (
  req: Request,
  match: Record<string, string>,
) => Response | Promise<Response>;

/**
 * A record of route paths and `MatchHandler`s which are called when a match is
 * found along with it's values.
 *
 * The route paths follow the path-to-regexp format with the addition of being able
 * to prefix a route with a method name and the `@` sign. For example a route only
 * accepting `GET` requests would look like: `GET@/`.
 */
export type Routes = Record<string, MatchHandler>;

/**
 * The default other handler for the router
 */
export function defaultOtherHandler(_req: Request): Response {
  return new Response(null, {
    status: 404,
  });
}

/**
 * The default error handler for the router
 */
export function defaultErrorHandler(_req: Request, err: unknown): Response {
  console.error(err);

  return new Response(null, {
    status: 500,
  });
}

/**
 * The default unknown method handler for the router
 */
export function defaultUnknownMethodHandler(
  _req: Request,
  knownMethods: string[],
): Response {
  return new Response(null, {
    status: 405,
    headers: {
      Accept: knownMethods.join(", "),
    },
  });
}

export const METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "PATCH",
] as const;

const methodRegex = new RegExp(`(?<=^(?:${METHODS.join("|")}))@`);

/**
 * A simple and tiny router for deno deploy
 *
 * ```
 * import { listenAndServe } from "https://deno.land/std/http/server.ts";
 * import { router } from "https://crux.land/router@0.0.5";
 *
 * await listenAndServe(
 *   ":8080",
 *   router({
 *     "/": (_req) => new Response("Hello world!", { status: 200 }),
 *   }),
 * );
 * ```
 *
 * @param routes A record of all routes and their corresponding handler functions
 * @param other An optional parameter which contains a handler for anything that
 * doesn't match the `routes` parameter
 * @param error An optional parameter which contains a handler for any time it
 * fails to run the default request handling code
 * @param unknownMethod An optional parameter which contains a handler for any time a method
 * that is not defined is used
 * @returns A deno deploy compatible request handler
 */
export function router(
  routes: Routes,
  other: RequestHandler = defaultOtherHandler,
  error: ErrorHandler = defaultErrorHandler,
  unknownMethod: UnknownMethodHandler = defaultUnknownMethodHandler,
): RequestHandler {
  return async (req) => {
    try {
      // route > method > handler
      const internalRoutes: Record<string, Record<string, MatchHandler>> = {};

      for (const [route, handler] of Object.entries(routes)) {
        const [methodOrPath, path] = route.split(methodRegex);

        if (path) {
          internalRoutes[path] ??= {};
          internalRoutes[path][methodOrPath] = handler;
        } else {
          internalRoutes[methodOrPath] ??= {};
          internalRoutes[methodOrPath]["any"] = handler;
        }
      }

      for (const [path, methods] of Object.entries(internalRoutes)) {
        const pattern = new URLPattern({
          pathname: path,
        });
        const res = pattern.exec(req.url);

        if (res !== null) {
          for (const [method, handler] of Object.entries(methods)) {
            if (req.method === method) {
              return await handler(
                req,
                res.pathname.groups as Record<string, string>,
              );
            }
          }
          if (methods["any"]) {
            return await methods["any"](
              req,
              res.pathname.groups as Record<string, string>,
            );
          } else {
            return await unknownMethod(req, Object.keys(methods));
          }
        }
      }

      return await other(req);
    } catch (err) {
      return error(req, err);
    }
  };
}
