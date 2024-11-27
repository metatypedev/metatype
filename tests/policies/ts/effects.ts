// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export function currentUserOnly(
  args: Record<string, Record<string, unknown>>,
  { context }: { context: Record<string, unknown> },
): boolean {
  const argValues = Object.values(args);
  return argValues.length > 0 &&
    argValues.every((arg) => arg.id === context.userId);
}
