// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { WitOpArgs } from "../../types.ts";

export type TaskSpec = {
  opName: string;
  componentPath: string;
};

export interface WasmMessage extends WitOpArgs {
  type: "CALL";
}

export type WasmEvent =
  | { type: "SUCCESS"; result: unknown }
  | { type: "FAILURE"; error: string; exception: Error | undefined };
