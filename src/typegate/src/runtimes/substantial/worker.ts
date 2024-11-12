// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { Context } from "./deno_context.ts";
import { Err, Msg, Ok, WorkerData, WorkflowResult } from "./types.ts";

let runCtx: Context | undefined;

self.onmessage = async function (event) {
  const { type, data } = event.data as WorkerData;
  switch (type) {
    case "START": {
      const { modulePath, functionName, run, schedule, kwargs, internal } =
        data;
      // FIXME: handle case when script is missing and notify WorkerManager so it cleans up
      // its registry.
      const module = await import(modulePath);

      // TODO: for python use the same strategy but instead call from native
      const workflowFn = module[functionName];

      if (typeof workflowFn !== "function") {
        self.postMessage(Err(`Function "${functionName}" not found`));
        self.close();
        return;
      }

      runCtx = new Context(run, kwargs, internal);

      workflowFn(runCtx, internal)
        .then((wfResult: unknown) => {
          self.postMessage(
            Ok(
              Msg(
                type,
                {
                  kind: "SUCCESS",
                  result: wfResult,
                  run: runCtx!.getRun(),
                  schedule,
                } satisfies WorkflowResult,
              ),
            ),
          );
        })
        .catch((wfException: unknown) => {
          self.postMessage(
            Ok(
              Msg(
                type,
                {
                  kind: "FAIL",
                  result: errorToString(wfException),
                  exception: wfException instanceof Error
                    ? wfException
                    : undefined,
                  run: runCtx!.getRun(),
                  schedule,
                } satisfies WorkflowResult,
              ),
            ),
          );
        });
      break;
    }
    default:
      self.postMessage(Err(Msg(type, `Unknown command ${type}`)));
  }
};
