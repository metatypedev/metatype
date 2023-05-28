// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export abstract class Protocol {
  protected constructor(public typegraphName: string) {}

  authMiddleware(_request: Request): Promise<Response | null> {
    return Promise.resolve(null);
  }

  abstract tokenMiddleware(
    token: string,
    url: URL,
  ): Promise<[Record<string, unknown>, Headers]>;
}
