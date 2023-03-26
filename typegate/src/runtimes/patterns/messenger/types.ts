// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Deferred } from "std/async/deferred.ts";

export interface Message<T> {
  id: number;
  op: number | null;
  data: T;
}

export type Answer<T> =
  | ({ id: number; data: T; error?: never })
  | ({ id: number; data?: never; error: string });

export interface TaskData {
  promise: Deferred<unknown>;
  hooks: Array<() => void | Promise<void>>;
}
