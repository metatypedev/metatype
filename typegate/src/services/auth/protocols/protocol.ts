// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { notFound } from "../../../services/responses.ts";

export abstract class Protocol {
  protected constructor(public typegraphName: string) {}

  authMiddleware(_request: Request): Promise<Response> {
    return Promise.resolve(notFound());
  }

  abstract tokenMiddleware(
    token: string,
    request: Request,
  ): Promise<[Record<string, unknown>, string | null]>;
}
