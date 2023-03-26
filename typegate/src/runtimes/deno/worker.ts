// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { getLogger } from "../../log.ts";
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

const taskList: Record<Task["type"], (task: Task) => Promise<unknown> | void> =
  {
    import_func: async (task: Task) => {
      const { moduleId, name, args, internals, verbose } =
        task as ImportFuncTask;
      if (!registry.has(moduleId)) {
        throw new Error(`no module registered with id ${moduleId}`);
      }

      verbose &&
        logger.info(`exec func "${name}" from module ${moduleId}`);
      const mod = registry.get(moduleId)! as TaskModule;
      return await mod[name](args, internals, make_internal(internals));
    },

    func: async (task: Task) => {
      const { fnId, args, internals, verbose } = task as FuncTask;
      if (!registry.has(fnId)) {
        throw new Error(`no function registered with id ${fnId}`);
      }

      verbose && logger.info(`exec func "${fnId}"`);
      const fn = registry.get(fnId)! as TaskExec;
      return await fn(args, internals, make_internal(internals));
    },

    register_import_func: async (task: Task) => {
      const { moduleId, moduleCode } = task as RegisterImportFuncTask;
      logger.info(`register import func "${moduleId}"`);

      registry.set(
        moduleId,
        await import(
          `data:text/javascript,${encodeURIComponent(moduleCode)}`
        ),
      );
    },

    register_func: (task: Task) => {
      const { fnId, fnCode } = task as RegisterFuncTask;
      logger.info(`register func "${fnId}"`);

      registry.set(
        fnId,
        new Function(`"use strict"; ${fnCode}; return _my_lambda;`)(),
      );

      return Promise.resolve();
    },
  };

self.onmessage = async (event: MessageEvent<Task & { id: number }>) => {
  if (initData == null) {
    initData = event.data as typeof initData;
    logger = getLogger(`worker (${initData.name})`);
    return;
  }

  const { id, type } = event.data;

  const exec = taskList[type];

  if (exec == null) {
    const error = `unsupported task type "${type}"`;
    logger.error(error);
    self.postMessage({
      id,
      error,
    });
  }

  try {
    const data = await exec(event.data);
    self.postMessage({ id, data });
  } catch (err) {
    logger.error(err);
    self.postMessage({ id, error: err.message });
  }
};
