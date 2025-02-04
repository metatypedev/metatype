// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { Context } from "./deno_context.ts";
import { toFileUrl } from "@std/path/to-file-url";
import { Interrupt, WorkflowEvent, WorkflowMessage } from "./types.ts";

let runCtx: Context | undefined;

self.onmessage = async function (event) {
  const { type, data } = event.data as WorkflowMessage;
  switch (type) {
    case "START": {
      const { modulePath, functionName, run, schedule, internal } = data;
      // FIXME: handle case when script is missing and notify WorkerManager so it cleans up
      // its registry.
      const module = await import(toFileUrl(modulePath).toString());

      // TODO: for python use the same strategy but instead call from native
      const workflowFn = module[functionName];

      if (typeof workflowFn !== "function") {
        self.postMessage(
          {
            type: "ERROR",
            error: `Function "${functionName}" not found`,
          } satisfies WorkflowEvent,
        );
        self.close();
        return;
      }

      runCtx = new Context(run, internal);

      workflowFn(runCtx, internal)
        .then((wfResult: unknown) => {
          self.postMessage(
            {
              type: "SUCCESS",
              result: wfResult,
              run: runCtx!.getRun(),
              schedule,
            } satisfies WorkflowEvent,
          );
        })
        .catch((wfException: unknown) => {
          const interrupt = Interrupt.getTypeOf(wfException);
          if (interrupt) {
            self.postMessage(
              {
                type: "INTERRUPT",
                interrupt,
                run: runCtx!.getRun(),
                schedule,
              } satisfies WorkflowEvent,
            );
          } else {
            self.postMessage(
              {
                type: "FAIL",
                error: errorToString(wfException),
                exception: wfException instanceof Error
                  ? wfException
                  : undefined,
                run: runCtx!.getRun(),
                schedule,
              } satisfies WorkflowEvent,
            );
          }
        });
      break;
    }
    default:
      self.postMessage(
        {
          type: "ERROR",
          error: `Unknown command ${type}`,
        } satisfies WorkflowEvent,
      );
  }
};
