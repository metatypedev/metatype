// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export type { Run } from "native";

export type AnyString = string & Record<string | number | symbol, never>;

export type WorkerEvent = "START" | "STOP" | "SEND" | AnyString;

export type WorkerData = {
  type: WorkerEvent;
  data: any;
};

export type WorkerEventHandler = (message: Result<unknown>) => void;

export type Result<T> = {
  error: boolean;
  payload: T;
};

export function Ok<R>(payload: R): Result<R> {
  return { error: false, payload };
}

export function Err<E>(payload: E): Result<E> {
  return { error: true, payload };
}
