// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// bring the unstable WorkerOptions api into scope
/// <reference lib="deno.worker" />

import { getLogger } from "../../log.ts";
import { make_internal } from "../../worker_utils.ts";
import type { Answer, Message } from "../patterns/messenger/types.ts";
import { toFileUrl } from "@std/path/to-file-url";

import type {
  FuncTask,
  ImportFuncTask,
  RegisterFuncTask,
  RegisterImportFuncTask,
  Task,
  TaskExec,
} from "./shared_types.ts";

let logger = getLogger("worker");

let initData = null as unknown as { name: string };

type TaskModule = Record<string, TaskExec>;
const registry: Map<number, TaskExec | TaskModule> = new Map();

const isTest = Deno.env.get("DENO_TESTING") === "true";
const additionalHeaders = isTest
  ? { connection: "close" }
  : { connection: "keep-alive" };

async function import_func(op: number, task: ImportFuncTask) {
  const { name, args, internals, verbose } = task;

  if (!registry.has(op)) {
    throw new Error(`no module registered with id ${op}`);
  }

  verbose && logger.info(`exec func "${name}" from module ${op}`);
  const mod = registry.get(op)! as TaskModule;
  if (name in mod && typeof mod[name] === "function") {
    return await mod[name](
      args,
      internals,
      make_internal(internals, additionalHeaders),
    );
  }
  throw new Error(`"${name}" is not a valid method`);
}

async function func(op: number, task: FuncTask) {
  const { args, internals, verbose } = task;

  if (!registry.has(op)) {
    throw new Error(`no function registered with id ${op}`);
  }

  verbose && logger.info(`exec func "${op}"`);
  const fn = registry.get(op)! as TaskExec;
  return await fn(args, internals, make_internal(internals, additionalHeaders));
}

async function register_import_func(_: null, task: RegisterImportFuncTask) {
  const { modulePath, verbose, op } = task;
  verbose &&
    logger.info(`register import func "${op}" from "${modulePath.toString()}`);

  registry.set(op, await import(toFileUrl(modulePath).toString()));
}

function register_func(_: null, task: RegisterFuncTask) {
  const { fnCode, verbose, op } = task;
  verbose && logger.info(`register func "${op}"`);

  registry.set(
    op,
    new Function(`"use strict"; ${fnCode}; return _my_lambda;`)(),
  );
}

const taskList: any = {
  register_func,
  register_import_func,
  import_func,
  func,
};

function answer<T>(res: Answer<T>) {
  self.postMessage(res);
}

self.onmessage = async (event: MessageEvent<Message<Task>>) => {
  if (initData == null) {
    initData = event.data as typeof initData;
    logger = getLogger(`worker (${initData.name})`);
    return;
  }

  const { id, op, data: task } = event.data;
  const exec = taskList[task.type];

  if (exec == null) {
    const error = `unsupported operation found "${op}"`;
    logger.error(error);
    answer({ id, error });
  }

  try {
    const data = await exec(op, task);
    answer({ id, data });
  } catch (err) {
    logger.error(err);
    answer({ id, error: String(err) });
  }
};
