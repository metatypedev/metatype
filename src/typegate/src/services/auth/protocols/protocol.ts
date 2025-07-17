// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { QueryEngine } from "../../../engine/query_engine.ts";
import { notFound } from "../../../services/responses.ts";

export type TokenMiddlewareOutput = {
  claims: Record<string, unknown>;
  nextToken: string | null;
  error: string | null;
};

export abstract class Protocol {
  protected constructor(public typegraphName: string) {}

  authMiddleware(_request: Request, _engine: QueryEngine): Promise<Response> {
    return Promise.resolve(notFound());
  }

  abstract tokenMiddleware(
    token: string,
    request: Request,
  ): Promise<TokenMiddlewareOutput>;
}
