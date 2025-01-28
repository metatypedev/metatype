// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { errorToString } from "../../worker_utils.ts";
import { WitWireHandle } from "../wit_wire/mod.ts";
import { WasmMessage } from "./types.ts";

const witWireInstances = new Map<string, WitWireHandle>();

async function hostcall(opName: string, json: string) {
  const prevHandler = self.onmessage;

  const response = await new Promise<{ result: any }>((resolve, reject) => {
    self.onmessage = (event) => resolve(event.data);
    self.onerror = (event) => reject(event.error);
    self.postMessage({ type: "HOSTCALL", opName, json });
  });

  self.onmessage = prevHandler;

  return response.result;
}

self.onmessage = async function (event: MessageEvent<WasmMessage>) {
  const { type } = event.data;

  switch (type) {
    case "CALL": {
      const { id, opName, args } = event.data;
      let instance = witWireInstances.get(id);

      if (!instance) {
        instance = await WitWireHandle.init({
          ...event.data,
          hostcall,
        });
        witWireInstances.set(id, instance);
      }

      try {
        self.postMessage({
          type: "SUCCESS",
          result: await instance.handle(opName, args),
        });
      } catch (error) {
        self.postMessage({
          type: "FAILURE",
          error: errorToString(error),
          exception: error,
        });
      }

      break;
    }

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
};
