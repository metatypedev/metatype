// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export interface Message<T> {
  id: number;
  op: string | number | null;
  data: T;
  remainingPulseCount?: number;
}

type PromiseWithResolvers<T> = ReturnType<typeof Promise.withResolvers<T>>;

export type Answer<T> =
  | ({ id: number; data: T; error?: never })
  | ({ id: number; data?: never; error: string });

export interface TaskData {
  promise: PromiseWithResolvers<unknown>;
  hooks: Array<() => void | Promise<void>>;
}
