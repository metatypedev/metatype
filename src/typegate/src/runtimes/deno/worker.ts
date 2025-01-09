// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { toFileUrl } from "@std/path/to-file-url";
import { DenoMessage } from "./types.ts";
import { errorToString, make_internal } from "../../worker_utils.ts";

const isTest = Deno.env.get("DENO_TESTING") === "true";

const additionalHeaders = isTest
  ? { connection: "close" }
  : { connection: "keep-alive" };

self.onmessage = async function (event: MessageEvent<DenoMessage>) {
  const { type, modulePath, functionName, args, internals } = event.data;
  switch (type) {
    case "CALL": {
      console.log({ modulePath, functionName, args, internals });
      const module = await import(toFileUrl(modulePath).toString());
      const fn = module[functionName];

      if (typeof fn !== "function") {
        // TODO post message??
        throw new Error(`Function "${functionName}" not found`);
      }

      try {
        const result = await fn(
          args,
          internals,
          make_internal(internals, additionalHeaders),
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
