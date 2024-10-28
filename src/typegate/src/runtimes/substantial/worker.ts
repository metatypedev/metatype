// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Context } from "./deno_context.ts";
import { Err, Msg, Ok, TaskData, WorkerData, WorkflowResult } from "./types.ts";

let runCtx: Context | undefined;

self.onmessage = async function (event) {
  const { type, data } = event.data as WorkerData;
  switch (type) {
    case "START": {
      const {
        modulePath,
        functionName,
        run,
        schedule,
        kwargs,
        internal,
        kind,
      } = data as TaskData;
      // FIXME: handle case when script is missing and notify WorkerManager so it cleans up
      // its registry.
      const module = await import(modulePath);

      runCtx = new Context(run, kwargs, internal);
      const workflowFn = module[functionName];

      if (kind == "DENO") {
        if (typeof workflowFn !== "function") {
          self.postMessage(Err(`Function "${functionName}" not found`));
          self.close();
          return;
        }
        workflowFn(runCtx)
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
                    result: wfException instanceof Error
                      ? wfException.message
                      : JSON.stringify(wfException),
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
      } else if (kind == "PYTHON") {
        try {
          const result = Meta.python.executePython({
            python_module_path: modulePath,
            python_function_name: functionName,
            executing_context: runCtx,
          });

          self.postMessage(
            Ok(Msg(
              type,
              {
                kind: "SUCCESS",
                result: result.execution_result,
                run: runCtx!.getRun(),
                schedule,
              } satisfies WorkflowResult,
            )),
          );
        } catch (pyException) {
          self.postMessage(
            Ok(Msg(
              type,
              {
                kind: "FAIL",
                result: pyException instanceof Error
                  ? pyException.message
                  : JSON.stringify(pyException),
                exception: pyException instanceof Error
                  ? pyException
                  : undefined,
                run: runCtx!.getRun(),
                schedule,
              } satisfies WorkflowResult,
            )),
          );
        }
      }
      break;
    }
    default:
      self.postMessage(Err(Msg(type, `Unknown command ${type}`)));
  }
};
