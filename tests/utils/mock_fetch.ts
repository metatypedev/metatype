// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/*
Lifted from https://github.com/clo4/deno_mock_fetch/blob/1ef9476b43b1b2b4cab0aaa576f713e8339f46b6/mod.ts
MIT License

Copyright (c) 2021 SeparateRecords
*/

import { MatchHandler, router, Routes } from "./router@0.0.5.ts";

export type { MatchHandler };

class UnhandledRouteError extends Error {
  routes: Routes;
  request: Request;
  constructor(init: { request: Request; routes: Routes }) {
    const { request, routes } = init;

    const method = request.method;
    const reqPath = new URL(request.url).pathname;
    const routesNumber = Object.entries(routes).length;
    const routePlural = routesNumber === 1
      ? "route has a handler"
      : "routes have handlers";

    // deno-fmt-ignore
    super(`${method} ${reqPath} (${routesNumber} ${routePlural})`);

    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.routes = routes;
    this.request = request;
  }
}

export interface MockFetch {
  fetch: typeof globalThis.fetch;
  mock: (route: string, handler: MatchHandler) => void;
  remove: (route: string) => void;
  reset: () => void;
}

/**
 * Get a set of functions that do not share any state with the globals.
 *
 * The returned object can be destructured.
 *
 * ```
 * const { fetch, mock, remove, reset } = sandbox()
 * ```
 */
export function sandbox(): MockFetch {
  const routeStore = new Map<string, MatchHandler>();

  async function fetch(
    input: string | Request | URL,
    init?: RequestInit,
  ): Promise<Response> {
    // Request constructor won't take a URL, so we need to normalize it first.
    if (input instanceof URL) input = input.toString();
    const req = new Request(input, init);

    const routes = Object.fromEntries(routeStore.entries());

    // The router needs to be constructed every time because the routes map is
    // very likely to change between fetches.
    return await router(
      routes,
      // If an unhandled route is fetched, throw an error.
      (request) => {
        throw new UnhandledRouteError({ request, routes });
      },
      // Errors thrown by a handler, including the unknown route handler, will
      // return a 500 Internal Server Error. That's the right behaviour in most
      // cases, but we actually *want* that to throw.
      (_, error) => {
        throw error;
      },
    )(req);
  }

  function mock(route: string, handler: MatchHandler) {
    routeStore.set(route, handler);
  }

  function remove(route: string) {
    routeStore.delete(route);
  }

  function reset() {
    routeStore.clear();
  }

  return {
    reset,
    mock,
    remove,
    fetch,
  };
}

const globalMockFetch = sandbox();

/** This is the function that replaces `fetch` when you call `install()`. */
export const mockedFetch = globalMockFetch.fetch;

/**
 * Mock a new route, or override an existing handler.
 *
 * The route uses URLPattern syntax, with the additional extension of
 * (optional) method routing by prefixing with the method,
 * eg. `"POST@/user/:id"`.
 *
 * The handler function may be asynchronous.
 *
 * ```
 * mock("GET@/users/:id", async (_req, params) => {
 *   const id = parseInt(params["id"]);
 *   const data = await magicallyGetMyUserData(id);
 *   return new Response(JSON.stringify(data));
 * })
 * ```
 */
export const mock = globalMockFetch.mock;

/** Remove an existing route handler. */
export const remove = globalMockFetch.remove;

/** Remove all existing route handlers. */
export const reset = globalMockFetch.reset;

// Store the original fetch so it can be restored later
const originalFetch = globalThis.fetch;

// The functions below are `const` for consistency.

/**
 * Replace `globalThis.fetch` with `mockedFetch` (or another function that
 * matches the `fetch` signature)
 *
 * To restore the original `globalThis.fetch`, call `uninstall()`.
 */
export const install = (replacement?: typeof fetch) => {
  globalThis.fetch = replacement ?? mockedFetch;
};

/**
 * Restore `globalThis.fetch` to what it was before this library was imported.
 */
export const uninstall = () => {
  globalThis.fetch = originalFetch;
  reset();
};
