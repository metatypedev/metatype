// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

interface ThreeInput {
  b: number;
  a: number;
}

export function three(
  { a, b }: ThreeInput,
  {}: { context: Record<string, unknown> },
): {
  a: number;
  b: number;
} {
  return { a, b };
}
