// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export interface LazyAssertOptions {
  timeoutMs: number;
  intervalMs?: number;
}

/**
 * Retry assert periodically until timeout is elapsed or the assert function passes.
 * Fails iff the assert function never succeed.
 */
export async function lazyAssert(
  { timeoutMs, intervalMs = 100 }: LazyAssertOptions,
  fn: () => void | Promise<void>,
) {
  const start = Date.now();
  let error: Error | null = null;
  while (Date.now() - start < timeoutMs) {
    try {
      await fn();
      return;
    } catch (e: any) {
      error = e;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  throw new Error(`timeout: ${error?.message}`);
}
