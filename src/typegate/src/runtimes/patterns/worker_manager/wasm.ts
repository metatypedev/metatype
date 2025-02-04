// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { envSharedWithWorkers } from "../../../config/shared.ts";
import { WasmEvent } from "../../wasm/types.ts";
import { WasmMessage } from "../../wasm/types.ts";
import { BaseWorker } from "./mod.ts";
import { EventHandler } from "./types.ts";

export class WasmWorker extends BaseWorker<WasmMessage, WasmEvent> {
  #worker: Worker;
  #workerId: string;
  constructor(workerId: string, workerPath: string) {
    super();
    this.#worker = new Worker(workerPath, {
      name: workerId,
      type: "module",
      deno: {
        // FIXME: What are correct permissions?
        permissions: {
          net: true,
          // on request permissions
          read: "inherit", // default read permission
          sys: "inherit",
          // non-overridable permissions (security between typegraphs)
          run: false,
          write: false,
          ffi: false,
          env: envSharedWithWorkers,
        },
      },
    });
    this.#workerId = workerId;
  }

  listen(handlerFn: EventHandler<WasmEvent>) {
    this.#worker.onmessage = async (message) => {
      await handlerFn(message.data as WasmEvent);
    };

    this.#worker.onerror = (event) => {
      throw event.error;
    };
  }

  send(msg: WasmMessage) {
    this.#worker.postMessage(msg);
  }

  destroy() {
    this.#worker.terminate();
  }

  get id() {
    return this.#workerId;
  }
}
