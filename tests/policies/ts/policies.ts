// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
