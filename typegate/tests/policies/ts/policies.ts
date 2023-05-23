// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
