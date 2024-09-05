// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Context } from "./deno_context.ts";
import { Err, Msg, Ok, WorkerData, WorkflowResult } from "./types.ts";

let runCtx: Context | undefined;

self.onmessage = async function (event) {
  const { type, data } = event.data as WorkerData;
  switch (type) {
    case "START": {
      const { modulePath, functionName, run, kwargs } = data;
      const module = await import(modulePath);
      // TODO: for python use the same strategy but instead call from native
      const workflowFn = module[functionName];

      if (typeof workflowFn !== "function") {
        self.postMessage(Err(`Function ${functionName} is not found`));
        self.close();
        return;
      }

      runCtx = new Context(run, kwargs);
      runCtx.start();

      workflowFn(runCtx)
        .then((wfResult: unknown) => {
          runCtx?.stop("Ok", wfResult);

          self.postMessage(
            Ok(
              Msg(
                type,
                {
                  kind: "SUCCESS",
                  result: wfResult,
                  run: runCtx!.getRun(),
                } satisfies WorkflowResult,
              ),
            ),
          );
        })
        .catch((wfException: unknown) => {
          runCtx?.stop("Err", null);

          self.postMessage(
            Ok(
              Msg(
                type,
                {
                  kind: "FAIL",
                  result: wfException instanceof Error
                    ? wfException.message
                    : JSON.stringify(wfException),
                  exception: wfException instanceof Error
                    ? wfException
                    : undefined,
                  run: runCtx!.getRun(),
                } satisfies WorkflowResult,
              ),
            ),
          );
        });
      break;
    }
    case "STOP": {
      runCtx?.stop("Err", "Stopped");
      self.postMessage(Ok(Msg(type, { run: runCtx?.getRun() })));
      self.close();
      break;
    }
    case "SEND": {
      const { event_name, payload } = data;
      runCtx?.event(event_name, payload);
      self.postMessage(Ok(Msg(type, data)));
      break;
    }
    default:
      self.postMessage(Err(Msg(type, `Unknown command ${type}`)));
  }
};
