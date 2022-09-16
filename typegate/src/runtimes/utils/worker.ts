import { getLogger } from "../../log.ts";
import { predefinedFuncs, Task, TaskExec } from "./codes.ts";

const logger = getLogger("worker");
logger.info("start webworker");

type TaskModule = Record<string, TaskExec>;

const fns: Map<number, TaskExec> = new Map();

// TODO: get worker name from events, for better logging

self.onmessage = async (evt: MessageEvent<Task>) => {
  switch (evt.data.type) {
    case "import_func": {
      const { id, module: path, name, args, context, verbose } = evt.data;
      verbose && logger.info(`running task ${name} in worker...`);
      const mod: TaskModule = await import(path);

      verbose && logger.info(`[${id}] exec func "${name}" from module ${path}`);
      const ret = await mod[name](args, context);

      self.postMessage({ id, data: ret });
      break;
    }

    case "func": {
      const { id, fnId, code, args, context, verbose } = evt.data;
      if (!fns.has(fnId)) {
        if (code == null) {
          throw new Error("function definition required");
        }
        fns.set(fnId, new Function(`"use strict"; return ${code}`)());
      }

      verbose && logger.info(`[${id}] exec func "${fnId}"`);
      const ret = await fns.get(fnId)!(args, context);

      self.postMessage({ id, data: ret });
      break;
    }

    case "predefined_func": {
      const { id, name, args, context, verbose } = evt.data;
      verbose && logger.info(`[${id}] exec predefined func "${name}"`);
      self.postMessage({ id, data: predefinedFuncs[name](args, context) });
      break;
    }

    default:
      throw new Error(
        `unsupported task type "${(evt.data as any).type as string}"`,
      );
  }
};
