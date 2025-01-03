// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as Sentry from "sentry";
import { envSharedWithWorkers } from "../../config/shared.ts";
import type { Task } from "./shared_types.ts";
import {
  type AsyncMessengerConfig,
  LazyAsyncMessenger,
} from "../patterns/messenger/lazy_async_messenger.ts";

export class DenoMessenger extends LazyAsyncMessenger<Worker, Task, unknown> {
  constructor(
    name: string,
    permissions: Deno.PermissionOptionsObject,
    lazy: boolean,
    ops: Map<number, Task>,
    config: AsyncMessengerConfig,
  ) {
    super(
      (receive) => {
        const worker = new Worker(import.meta.resolve("./worker.ts"), {
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
      config,
    );

    if (lazy) {
      this.enableLazyness();
    }
  }
}
