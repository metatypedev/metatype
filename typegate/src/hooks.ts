// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { parseGraphQLTypeGraph } from "./graphql/graphql.ts";
import { MessageEntry } from "./register.ts";
import { TypeGraph, TypeGraphDS } from "./typegraph.ts";
import { upgradeTypegraph } from "./typegraph/versions.ts";

const Log = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;

type LogType = typeof Log extends Record<string, infer R> ? R : never;

class Logger {
  constructor(private output: MessageEntry[]) {}
  info(text: string) {
    this.output.push({ type: Log.INFO, text });
  }
  warn(text: string) {
    this.output.push({ type: Log.WARNING, text });
  }
  error(text: string) {
    this.output.push({ type: Log.ERROR, text });
  }
}

interface PushHandler {
  (tg: TypeGraphDS, logger: Logger): Promise<TypeGraphDS>;
}

interface InitHandler {
  (tg: TypeGraph, sync: boolean): Promise<void>;
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
  messageOutput: MessageEntry[] | null,
): Promise<TypeGraphDS> {
  const logger = new Logger(messageOutput ?? []);
  let res = typegraph;

  for (const handler of hooks.onPush) {
    res = await handler(res, logger);
  }

  return res;
}

export async function handleOnInitHooks(
  typegraph: TypeGraph,
  sync: boolean,
): Promise<void> {
  await Promise.all(
    hooks.onInit.map((handler) => handler(typegraph, sync)),
  );
}
