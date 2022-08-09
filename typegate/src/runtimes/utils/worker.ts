import { getLogger } from "../../log.ts";
import { Task, TaskExec } from "./codes.ts";

const logger = getLogger("worker");
logger.info("start webworker");

type TaskModule = Record<string, TaskExec>;

const fns: Record<string, TaskExec> = {};

self.onmessage = async (evt: MessageEvent<Task>) => {
  switch (evt.data.type) {
    case "module": {
      const { id, name, path, args, context } = evt.data;
      logger.info(`running task ${name} in worker...`);
      const mod: TaskModule = await import(path);

      logger.info(`[${id}] exec func "${name}" from module ${path}`);
      const ret = await mod[name](args, context);
      self.postMessage({ id, data: ret });
      break;
    }

    case "func": {
      const { name, id, code, args, context } = evt.data;
      if (code != undefined) {
        fns[name] = new Function(`"use strict"; return ${code}`)();
      }

      logger.info(`[${id}] exec func "${name}"`);
      const ret = await fns[name](args, context);
      self.postMessage({ id, data: ret });
      break;
    }

    default:
      throw new Error(
        `unsupported task type "${(evt.data as any).type as string}"`,
      );
  }
};
