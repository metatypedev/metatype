// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { parseGraphQLTypeGraph } from "./graphql/graphql.ts";
import { MessageEntry, Migrations } from "./register.ts";
import { SecretManager, TypeGraph, TypeGraphDS } from "./typegraph.ts";
import { upgradeTypegraph } from "./typegraph/versions.ts";

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

interface PushHandler {
  (
    tg: TypeGraphDS,
    secretManager: SecretManager,
    response: PushResponse,
  ): Promise<TypeGraphDS>;
}

interface InitHandler {
  (tg: TypeGraph, secretManager: SecretManager, sync: boolean): Promise<void>;
}

interface Hooks {
  onPush: PushHandler[]; // before redis synchronization -- only once
  onInit: InitHandler[]; // after redis sync -- run on each typegate instance
}

const hooks: Hooks = {
  onPush: [
    (tg) => Promise.resolve(upgradeTypegraph(tg)),
    (tg) => Promise.resolve(parseGraphQLTypeGraph(tg)),
  ],
  onInit: [],
};

export function registerHook(when: "onPush", handler: PushHandler): void;
export function registerHook(when: "onInit", handler: InitHandler): void;
export function registerHook(
  when: keyof Hooks,
  handler: Hooks[keyof Hooks][number],
): void {
  (hooks[when] as unknown[]).push(handler);
}

export async function handleOnPushHooks(
  typegraph: TypeGraphDS,
  secretManager: SecretManager,
  response: PushResponse,
): Promise<TypeGraphDS> {
  let res = typegraph;

  for (const handler of hooks.onPush) {
    res = await handler(res, secretManager, response);
  }

  return res;
}

export async function handleOnInitHooks(
  typegraph: TypeGraph,
  secretManager: SecretManager,
  sync: boolean,
): Promise<void> {
  await Promise.all(
    hooks.onInit.map((handler) => handler(typegraph, secretManager, sync)),
  );
}
