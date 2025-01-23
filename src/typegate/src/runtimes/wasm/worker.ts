// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { handleWitOp, WitWireHandle } from "../wit_wire/mod.ts";
import { WasmCallMessage } from "./types.ts";

const witWireInstances = new Map<string, WitWireHandle>();

function hostcall(op: string, json: string) {
  self.postMessage({ type: "HOSTCALL", op, json });

  return new Promise((resolve, reject) => {
    const prevHandler = self.onmessage;

    self.onmessage = (event) => {
      if (prevHandler) {
        self.onmessage = prevHandler;
      }
      resolve(event.data);
    };

    self.onerror = (event) => {
      if (prevHandler) {
        self.onmessage = prevHandler;
      }
      reject(event.error);
    };
  });
}

self.onmessage = async function (event: MessageEvent<WasmCallMessage>) {
  const { type, id } = event.data;

  if (!witWireInstances.has(id)) {
    const handle = await WitWireHandle.init({ ...event.data, hostcall });
    witWireInstances.set(id, handle);
  }

  switch (type) {
    case "CALL":
      try {
        self.postMessage({
          type: "SUCCESS",
          result: await handleWitOp(event.data),
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
