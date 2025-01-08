// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export type TaskId = string;

export interface BaseMessage {
  type: string;
}

export type EventHandler<E extends BaseMessage> = (
  message: E,
) => void | Promise<void>;
