// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { MessageEntry, Migrations } from "../typegate/register.ts";
import type { SecretManager, TypeGraphDS } from "../typegraph/mod.ts";

const Message = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;

export type PushFailure = {
  reason: "DatabaseResetRequired";
  message: string;
  runtimeName: string;
} | {
  reason: "NullConstraintViolation";
  message: string;
  runtimeName: string;
  column: string;
  table: string;
} | {
  reason: "Unknown";
  message: string;
};

export class PushResponse {
  tgName?: string;
  messages: MessageEntry[] = [];
  migrations: Migrations[] = [];
  failure: PushFailure | undefined;

  constructor() {}

  typegraphName(name: string) {
    this.tgName = name;
  }

  info(text: string) {
    this.messages.push({ type: Message.INFO, text });
  }

  warn(text: string) {
    this.messages.push({ type: Message.WARNING, text });
  }

  error(text: string) {
    this.messages.push({ type: Message.ERROR, text });
  }

  migration(rtName: string, migrations: string) {
    this.migrations.push({
      runtime: rtName,
      migrations,
    });
  }

  setFailure(reason: PushFailure) {
    this.failure = reason;
  }

  hasFailed() {
    return this.failure != null;
  }

  hasError() {
    return this.messages.some((e) => e.type === Message.ERROR);
  }
}

export interface PushHandler {
  (
    tg: TypeGraphDS,
    secretManager: SecretManager,
    response: PushResponse,
  ): Promise<TypeGraphDS>;
}
