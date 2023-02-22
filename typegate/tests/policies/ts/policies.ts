// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

interface ReadSecretInput {
  username: string;
}

export function readSecret(
  { username }: ReadSecretInput,
): {
  username: string;
  data: string;
} {
  return { username, data: "secret" };
}

export function isAllowedToReadSecret(
  args: Record<string, Record<string, unknown>>,
  { context }: { context: Record<string, unknown> },
): boolean {
  return args.secret.username === context.username;
}
