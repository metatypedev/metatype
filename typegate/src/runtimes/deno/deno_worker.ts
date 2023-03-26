// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as Sentry from "sentry";
import { envSharedWithWorkers } from "../../log.ts";
import { Task } from "./shared_types.ts";
import { dirname, fromFileUrl, resolve, toFileUrl } from "std/path/mod.ts";
import { LazyAsyncMessenger } from "./lazy_async_messenger.ts";

const localDir = dirname(fromFileUrl(import.meta.url));
const workerFile = toFileUrl(resolve(localDir, "./worker.ts"));

export class DenoWorker extends LazyAsyncMessenger<Worker, Task, unknown> {
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
              ...permissions,
              // non-overridable permissions (security between typegraphs)
              run: false,
              read: false,
              write: false,
              ffi: false,
              env: envSharedWithWorkers, // use secrets on the materializer instead
            },
          },
        } as WorkerOptions);
        worker.onmessage = async (event) => {
          await receive(event.data);
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
      (broker, id, op, message) => {
        broker.postMessage({ id, op, ...message });
        return Promise.resolve();
      },
      (broker) => {
        broker.terminate();
        return Promise.resolve();
      },
    );
    if (lazy) {
      this.enableLazyness();
    }
  }
}
