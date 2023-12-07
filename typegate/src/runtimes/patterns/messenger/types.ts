// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Deferred } from "std/async/deferred.ts";

export interface Message<T> {
  id: number;
  op: string | number | null;
  data: T;
  remainingPulseCount?: number;
}

export type Answer<T> =
  | ({ id: number; data: T; error?: never })
  | ({ id: number; data?: never; error: string });

export interface TaskData {
  promise: Deferred<unknown>;
  hooks: Array<() => void | Promise<void>>;
}
