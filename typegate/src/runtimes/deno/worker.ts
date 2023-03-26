// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { getLogger } from "../../log.ts";
import { Answer, Message } from "../patterns/messenger/types.ts";
import {
  FuncTask,
  ImportFuncTask,
  RegisterFuncTask,
  RegisterImportFuncTask,
  Task,
  TaskContext,
  TaskExec,
} from "./shared_types.ts";

let logger = getLogger("worker");

let initData = null as unknown as { name: string };

type TaskModule = Record<string, TaskExec>;
const registry: Map<number, TaskExec | TaskModule> = new Map();

const isTest = Deno.env.get("DENO_TESTING") === "true";
const additionalHeaders = isTest
  ? { "connection": "close" }
  : { "connection": "keep-alive" };

const make_internal = ({ meta: { url, token } }: TaskContext) => {
  const gql = (query: readonly string[], ...args: unknown[]) => {
    if (args.length > 0) {
      throw new Error("gql does not support arguments, use variables instead");
    }
    return {
      run: async (
        variables: Record<string, unknown>,
      ): Promise<Record<string, unknown>> => {
        const res = await fetch(
          url,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              "authorization": `Bearer ${token}`,
              ...additionalHeaders,
            },
            body: JSON.stringify({
              query: query[0],
              variables,
            }),
          },
        );
        if (!res.ok) {
          throw new Error(`gql fetch on ${url} failed: ${await res.text()}`);
        }
        return res.json();
      },
    };
  };
  return { gql };
};

async function import_func(op: number, task: ImportFuncTask) {
  const { name, args, internals, verbose } = task;

  if (!registry.has(op)) {
    throw new Error(`no module registered with id ${op}`);
  }

  verbose &&
    logger.info(`exec func "${name}" from module ${op}`);
  const mod = registry.get(op)! as TaskModule;
  return await mod[name](args, internals, make_internal(internals));
}

async function func(op: number, task: FuncTask) {
  const { args, internals, verbose } = task;

  if (!registry.has(op)) {
    throw new Error(`no function registered with id ${op}`);
  }

  verbose && logger.info(`exec func "${op}"`);
  const fn = registry.get(op)! as TaskExec;
  return await fn(args, internals, make_internal(internals));
}

async function register_import_func(_: null, task: RegisterImportFuncTask) {
  const { moduleCode, verbose, op } = task;
  verbose && logger.info(`register import func "${op}"`);

  registry.set(
    op,
    await import(
      `data:text/javascript,${encodeURIComponent(moduleCode)}`
    ),
  );
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
    console.log(">", task);
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
