import { getLogger } from "../../log.ts";
import { Task, TaskExec } from "./codes.ts";

const logger = getLogger("worker");
logger.info("start webworker");

type TaskModule = Record<string, TaskExec>;

const fns: Record<number, TaskExec> = {};

self.onmessage = async (evt: MessageEvent<Task>) => {
  switch (evt.data.type) {
    case "import_func": {
      const { id, module: path, name, args, context } = evt.data;
      logger.info(`running task ${name} in worker...`);
      const mod: TaskModule = await import(path);

      logger.info(`[${id}] exec func "${name}" from module ${path}`);
      const ret = await mod[name](args, context);
      self.postMessage({ id, data: ret });
      break;
    }

    case "func": {
      const { id, fnId, code, args, context } = evt.data;
      if (code != undefined) {
        fns[fnId] = new Function(`"use strict"; return ${code}`)();
      }

      logger.info(`[${id}] exec func "${fnId}"`);
      const ret = await fns[fnId](args, context);
      self.postMessage({ id, data: ret });
      break;
    }

    default:
      throw new Error(
        `unsupported task type "${(evt.data as any).type as string}"`,
      );
  }
};
