// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as Sentry from "sentry";
import { envSharedWithWorkers } from "../../log.ts";
import { Task } from "./shared_types.ts";
import { dirname, fromFileUrl, resolve, toFileUrl } from "std/path/mod.ts";
import { LazyAsyncMessenger } from "../patterns/messenger/lazy_async_messenger.ts";
import { Message } from "../patterns/messenger/types.ts";

import { BinaryHeap } from "std/collections/binary_heap.ts";

const localDir = dirname(fromFileUrl(import.meta.url));
const workerFile = toFileUrl(resolve(localDir, "./worker.ts"));

export interface TickCallback {
  (): Promise<void>;
}

export class PulseHandle {
  static createdCount = 0;
  #stop = false;
  constructor(
    private tickMs = 1000,
  ) {
    PulseHandle.createdCount++;
  }

  // raw setInterval tends to trigger Leaking async ops errors
  // the idea is to wrap the timer logic inside promises

  static sleep(ms = 100) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  stop() {
    this.#stop = true;
  }

  async loop(fn: TickCallback) {
    while (!this.#stop) {
      await Promise.resolve(fn());
      await PulseHandle.sleep(this.tickMs);
    }
    PulseHandle.createdCount--;
    console.log("stopped safely, remaining ", PulseHandle.createdCount);
  }
}

export class DenoMessenger extends LazyAsyncMessenger<Worker, Task, unknown> {
  pendingOperations: BinaryHeap<
    { date: number; worker: Worker; message: Message<Task> }
  > = new BinaryHeap((a, b) => a.date - b.date);
  doneIds: Set<number> = new Set<number>();

  constructor(
    name: string,
    permissions: Deno.PermissionOptionsObject,
    lazy: boolean,
    ops: Map<number, Task>,
  ) {
    super(
      (receive) => {
        const worker = new Worker(workerFile, {
          type: "module",
          deno: {
            namespace: false,
            permissions: {
              // overrideable default permissions
              hrtime: false,
              net: true,
              // on request permissions
              read: false, // default read permission
              ...permissions,
              // non-overridable permissions (security between typegraphs)
              run: false,
              write: false,
              ffi: false,
              env: envSharedWithWorkers, // use secrets on the materializer instead
            },
          },
        } as WorkerOptions);
        worker.onmessage = async (event) => {
          await receive(event.data);
          this.doneIds.add(event.data.id);
          console.log("Removing id", event.data.id);
        };
        worker.onerror = (error) => {
          console.error(error.message);
          Sentry.captureException(error.message);
          throw error;
        };
        worker.onmessageerror = (error) => {
          console.error(error);
          Sentry.captureException(error);
          throw error;
        };

        worker.postMessage({
          name,
        });
        return worker;
      },
      ops,
      (broker, message) => {
        this.pendingOperations.push({
          date: Date.now(),
          worker: broker,
          message: message,
        });
        broker.postMessage(message);
      },
      (broker) => {
        broker.terminate();
      },
    );

    const tickMs = 1000;
    const maxDurationMs = 5000;

    const pulse = new PulseHandle(tickMs);
    pulse.loop(async () => {
      const currentDate = Date.now();
      const item = this.pendingOperations.peek();
      if (item !== undefined) {
        const delta = currentDate - item.date;
        if (this.doneIds.has(item.message.id)) {
          this.pendingOperations.pop(); // O(log N)
          this.doneIds.delete(item.message.id); // O(1)

          // console.log(
          //   "done safely",
          //   item.message.id,
          //   "currentSize",
          //   this.pendingOperations.length,
          // );

          if (this.pendingOperations.length == 0) {
            pulse.stop();
          }
        } else if (delta >= maxDurationMs) {
          this.receive({
            id: item.message.id,
            error: `timeout exceeded for id ${item.message.id}`,
          });

          this.pendingOperations.pop(); // O(log N)
          await this.terminate();

          // console.log(
          //   "Removing id",
          //   item.message.id,
          //   "op",
          //   item.message.op,
          //   "currentSize",
          //   this.pendingOperations.length,
          // );

          if (this.pendingOperations.length == 0) {
            pulse.stop();
          }
        }
      }
    });

    if (lazy) {
      this.enableLazyness();
    }
  }
}
