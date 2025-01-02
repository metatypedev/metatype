// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

let count = 0;

export function counter(): number {
  return ++count;
}

export function sum({ numbers }: { numbers: number[] }): number {
  return numbers.reduce((a, b) => a + b, 0);
}

export function secrets(_inp: any, cx: { secrets: Record<string, string> }) {
  if (cx.secrets.DENO_SECRET !== "deno_secret") {
    throw new Error("Deno secret not found");
  }
  return { ok: true };
}
