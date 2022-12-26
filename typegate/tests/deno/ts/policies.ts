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

interface IsAllowedToReadSecretInput {
  username: string;
}

export function isAllowedToReadSecret(
  { username }: IsAllowedToReadSecretInput,
  { context }: { context: Record<string, unknown> },
): boolean {
  return username === context.username;
}
