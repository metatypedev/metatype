// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as Sentry from "sentry";
import { envSharedWithWorkers } from "../../log.ts";
import { Task } from "./shared_types.ts";
import { dirname, fromFileUrl, resolve, toFileUrl } from "std/path/mod.ts";
import { LazyAsyncMessenger } from "../patterns/messenger/lazy_async_messenger.ts";

const localDir = dirname(fromFileUrl(import.meta.url));
const workerFile = toFileUrl(resolve(localDir, "./worker.ts"));

export class DenoMessenger extends LazyAsyncMessenger<Worker, Task, unknown> {
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
              read: ["tmp/scripts"],
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
      (broker, message) => {
        broker.postMessage(message);
      },
      (broker) => {
        broker.terminate();
      },
    );
    if (lazy) {
      this.enableLazyness();
    }
  }
}
