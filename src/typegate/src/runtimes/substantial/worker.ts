// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { Context } from "./deno_context.ts";
import { toFileUrl } from "@std/path/to-file-url";
import { Err, Ok, WorkflowMessage, WorkflowResult } from "./types.ts";

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
        self.postMessage(Err(`Function "${functionName}" not found`));
        self.close();
        return;
      }

      runCtx = new Context(run, internal);

      workflowFn(runCtx, internal)
        .then((wfResult: unknown) => {
          self.postMessage(
            Ok(
              {
                type,
                data: {
                  kind: "SUCCESS",
                  result: wfResult,
                  run: runCtx!.getRun(),
                  schedule,
                } satisfies WorkflowResult,
              },
            ),
          );
        })
        .catch((wfException: unknown) => {
          self.postMessage(
            Ok(
              {
                type,
                data: {
                  kind: "FAIL",
                  result: errorToString(wfException),
                  exception: wfException instanceof Error
                    ? wfException
                    : undefined,
                  run: runCtx!.getRun(),
                  schedule,
                } satisfies WorkflowResult,
              },
            ),
          );
        });
      break;
    }
    default:
      self.postMessage(Err({ type, data: `Unknown command ${type}` }));
  }
};
