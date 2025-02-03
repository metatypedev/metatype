// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { WitOpArgs } from "../../types.ts";

export type TaskSpec = {
  opName: string;
  componentPath: string;
};

export type WasmCallMessage = { type: "CALL" } & WitOpArgs;

export type WasmMessage =
  | WasmCallMessage
  | { type: "HOSTCALL"; result: any }
  | { type: "SHUTDOWN" };

export type WasmEvent =
  | { type: "SUCCESS"; result: unknown }
  | { type: "HOSTCALL"; opName: string; json: string }
  | { type: "SHUTDOWN" }
  | { type: "FAILURE"; error: string; exception: Error | undefined };
