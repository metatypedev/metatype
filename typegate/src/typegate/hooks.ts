// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { MessageEntry, Migrations } from "../typegate/register.ts";
import { SecretManager, TypeGraphDS } from "../typegraph/mod.ts";

const Message = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;

export class PushResponse {
  tgName?: string;
  messages: MessageEntry[] = [];
  migrations: Migrations[] = [];
  resetRequired: string[] = [];

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

  resetDb(rtName: string) {
    this.resetRequired.push(rtName);
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
