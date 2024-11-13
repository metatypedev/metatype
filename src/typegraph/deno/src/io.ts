// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { inspect } from "node:util";
// import { createInterface, Interface } from "node:readline";
import process from "node:process";
import { rpcRequest } from "./gen/client.ts";
/**
 * see: module level documentation `meta-cli/src/deploy/actors/task.rs`
 */

const JSONRPC_VERSION = "2.0";

function writeRpcMessage(message: string) {
  // split into 32-KiB chunks
  const chunkSize = 32758; // 32 KiB - 10 bytes for "jsonrpc^: " or "jsonrpc$: "
  for (let i = 0; i < message.length; i += chunkSize) {
    const chunk = message.slice(i, i + chunkSize);
    if (i + chunkSize < message.length) {
      process.stdout.write(`jsonrpc^: ${chunk}\n`);
      continue;
    }
    process.stdout.write(`jsonrpc$: ${message.slice(i, i + chunkSize)}\n`);
  }
}

type RpcNotificationMethod =
  | "Debug"
  | "Info"
  | "Warning"
  | "Error"
  | "Success"
  | "Failure";

const rpcNotify = (method: RpcNotificationMethod, params: any = null) => {
  const message = JSON.stringify({
    jsonrpc: JSONRPC_VERSION,
    method,
    params,
  });
  writeRpcMessage(message);
};

function getOutput(args: any[]) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      return inspect(arg, {
        colors: process.stdout.isTTY,
        depth: 10,
        maxStringLength: 1000,
        maxArrayLength: 20,
      });
    })
    .join(" ");
}

export const log = {
  debug(...args: any[]) {
    rpcNotify("Debug", { message: getOutput(args) });
  },
  info(...args: any[]) {
    rpcNotify("Info", { message: getOutput(args) });
  },
  warn(...args: any[]) {
    rpcNotify("Warning", { message: getOutput(args) });
  },
  error(...args: any[]) {
    rpcNotify("Error", { message: getOutput(args) });
  },

  failure(data: any) {
    rpcNotify("Failure", { data: data });
  },
  success(data: any, noEncode = false) {
    if (noEncode) {
      rpcNotify("Success", { data: JSON.parse(data) });
    } else {
      rpcNotify("Success", { data: data });
    }
  },
};

const rpcCall = (() => {
  return (method: string, params: any = null) => rpcRequest(method, params);
})();

export interface DeployTarget {
  baseUrl: string;
  auth: {
    username: string;
    password: string;
  };
}

export interface MigrationAction {
  apply: boolean;
  create: boolean;
  reset: boolean;
}

export interface DeployData {
  secrets: Record<string, string>;
  defaultMigrationAction: MigrationAction;
  migrationActions: Record<string, MigrationAction>;
}

export const rpc = {
  getDeployTarget: () => rpcCall("GetDeployTarget") as Promise<DeployTarget>,
  getDeployData: (typegraph: string) =>
    rpcRequest<DeployData, { typegraph: string }>(
      "GetDeployData",
      { typegraph },
      false, // Don't transform object keys
    ),
};
