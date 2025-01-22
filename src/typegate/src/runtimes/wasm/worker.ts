// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { handleWitOp } from "../wit_wire/mod.ts";
import { WasmMessage } from "./types.ts";

self.onmessage = async function (event: MessageEvent<WasmMessage>) {
  const { type } = event.data;

  switch (type) {
    case "CALL":
      try {
        // FIXME: wit_wire instance is not available in the worker, why???
        const result = await handleWitOp(event.data);
        self.postMessage({
          type: "SUCCESS",
          result,
        });
      } catch (error) {
        self.postMessage({
          type: "FAILURE",
          error: errorToString(error),
          exception: error,
        });
      }
      break;

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
};
