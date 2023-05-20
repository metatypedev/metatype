// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export class ResolverError extends Error {
  constructor(message: string) {
    super(message);
  }
}
