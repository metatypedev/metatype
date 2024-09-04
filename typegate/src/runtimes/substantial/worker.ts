// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Context } from "./deno_context.ts";
import { Err, Msg, Ok, WorkerData } from "./types.ts";

let runCtx: Context | undefined;

self.onmessage = async function (event) {
  const { type, data } = event.data as WorkerData;
  switch (type) {
    case "START": {
      const { modulePath, functionName, run } = data;
      const module = await import(modulePath);
      const workflowFn = module[functionName];

      if (typeof workflowFn !== "function") {
        self.postMessage(Err(`Function ${functionName} is not found`));
        self.close();
        return;
      }

      runCtx = new Context(run);

      workflowFn(runCtx)
        .then((wfResult: unknown) => {
          runCtx?.stop();

          self.postMessage(
            Ok(Msg(type, { result: wfResult, run: runCtx?.getRun() })),
          );
        })
        .catch((wfException: unknown) => {
          self.postMessage(
            Ok(
              Msg(type, {
                type,
                result: wfException,
                run: runCtx?.getRun(),
              }),
            ),
          );
        });
      break;
    }
    case "STOP": {
      runCtx?.stop();

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
