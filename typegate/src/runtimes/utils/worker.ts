import { getLogger } from "../../log.ts";
import { Task } from "./types.ts";
import { FuncTaskData, ModuleTaskData } from "./types.ts";

const logger = getLogger("worker");
logger.info("start webworker");

interface Exec {
  (
    args: Record<string, unknown>,
    context: Record<string, string>,
  ): unknown | Promise<unknown>;
}

interface TaskModule {
  default: Exec;
}

const modules: Record<string, TaskModule> = {};
const fns: Record<string, Exec> = {};

self.onmessage = async (evt: MessageEvent<Task>) => {
  switch (evt.data.type) {
    case "module": {
      const { id, name, path, data: inData } = evt.data;
      if (path) {
        console.log(path);
        const mod: TaskModule = await import(path);
        modules[evt.data.name] = mod;
      }

      const decoded: ModuleTaskData = JSON.parse(
        new TextDecoder().decode(inData),
      );
      const ret = await modules[name].default(decoded.args, decoded.context);

      const outData = new TextEncoder().encode(JSON.stringify(ret)).buffer;
      self.postMessage({ id, data: outData }, [outData]);
      break;
    }

    case "func": {
      const { name, id, data: inData } = evt.data;
      const decoded: FuncTaskData = JSON.parse(
        new TextDecoder().decode(inData),
      );
      if (decoded.code != undefined) {
        fns[name] = new Function(`"use strict"; return ${decoded.code}`)();
      }

      const ret = await fns[name](decoded.args, decoded.context);

      const outData = new TextEncoder().encode(JSON.stringify(ret)).buffer;
      self.postMessage({ id, data: outData }, [outData]);
      break;
    }

    default:
      throw new Error(
        `unsupported task type "${(evt.data as any).type as string}"`,
      );
  }
};
