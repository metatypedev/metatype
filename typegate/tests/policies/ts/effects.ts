// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export function currentUserOnly(
  args: Record<string, Record<string, unknown>>,
  { context }: { context: Record<string, unknown> },
): boolean {
  const argValues = Object.values(args);
  return argValues.length > 0 &&
    argValues.every((arg) => arg.id === context.userId);
}
