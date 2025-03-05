// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { toFileUrl } from "@std/path/to-file-url";
import { DenoEvent, DenoMessage } from "./types.ts";
import { errorToString, HostcallPump } from "../../worker_utils.ts";

const hostcallPump = new HostcallPump();

self.onmessage = async function (event: MessageEvent<DenoMessage>) {
  if (event.data.type == "HOSTCALL_RESP") {
    hostcallPump.handleResponse(event.data);
    return;
  }
  const { type, modulePath, functionName, args, internals } = event.data;
  switch (type) {
    case "CALL": {
      const module = await import(toFileUrl(modulePath).toString());
      const fn = module[functionName];

      if (typeof fn !== "function") {
        postMessage({
          type: "FAILURE",
          error: `Function "${functionName}" not found`,
        });
        return;
      }

      try {
        const result = await fn(
          args,
          internals,
          hostcallPump.newHandler((id, opName, json) => {
            postMessage(
              {
                type: "HOSTCALL",
                id,
                opName,
                json,
              } satisfies DenoEvent,
            );
          }),
        );
        self.postMessage({
          type: "SUCCESS",
          result,
        });
      } catch (e) {
        self.postMessage({
          type: "FAILURE",
          error: errorToString(e),
          exception: e,
        });
      }

      break;
    }

    default:
      // unreachable
      throw new Error(`Unknown message type: ${type}`);
  }
};
