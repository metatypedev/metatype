// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { BaseMessage } from "./types.ts";

export interface DenoWorkerError extends BaseMessage {
  type: "WORKER_ERROR";
  event: ErrorEvent;
}

export type BaseDenoWorkerMessage = BaseMessage | DenoWorkerError;
