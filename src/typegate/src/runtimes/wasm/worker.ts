// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { handleWitOp, WitWireHandle } from "../wit_wire/mod.ts";
import { WasmMessage } from "./types.ts";

const wireInstances = new Map<string, WitWireHandle>();

self.onmessage = async function (event: MessageEvent<WasmMessage>) {
  const { type, id, componentPath, ops } = event.data;

  if (!wireInstances.has(id)) {
    const handle = await WitWireHandle.init(componentPath, id, ops);
    wireInstances.set(id, handle);
  }

  switch (type) {
    case "CALL":
      try {
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
