import { envSharedWithWorkers } from "../../config/shared.ts";
import { BaseWorker } from "./worker_manager.ts";

export class DenoWorker<I, O> extends BaseWorker<I, O> {
  #id: string;
  #worker: Worker;

  constructor(id: string, workerPath: string) {
    super();
    this.#id = id;
    this.#worker = new Worker(workerPath, {
      name: id,
      type: "module",
      deno: {
        permissions: {
          net: true,
          read: "inherit",
          sys: "inherit", // what?
          run: false,
          write: false,
          ffi: false,
          env: envSharedWithWorkers,
        },
      },
    });
  }

  sendMessage(message: I) {
    this.#worker.postMessage(message);
  }

  listen(handler: (message: O) => void) {
    this.#worker.onmessage = (event) => {
      handler(event.data as O);
    };
  }

  destroy() {
    this.#worker.terminate();
  }

  get id() {
    return this.#id;
  }
}
