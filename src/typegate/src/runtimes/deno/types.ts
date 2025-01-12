// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TaskContext } from "./shared_types.ts";

export type TaskSpec = {
  modulePath: string;
  functionName: string;
};

export type DenoMessage = {
  type: "CALL";
  modulePath: string;
  functionName: string;
  args: unknown;
  internals: TaskContext;
};

export type DenoEvent =
  | { type: "SUCCESS"; result: unknown }
  | { type: "FAILURE"; error: string; exception: Error | undefined };
