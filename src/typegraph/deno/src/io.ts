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
  | "Serialize"
  | "Debug"
  | "Info"
  | "Warning"
  | "Error"
  | "Success"
  | "Failure";

export const rpcNotify = (
  method: RpcNotificationMethod,
  // deno-lint-ignore no-explicit-any
  params: any = null,
): void => {
  const message = JSON.stringify({
    jsonrpc: JSONRPC_VERSION,
    method,
    params,
  });
  writeRpcMessage(message);
};

// deno-lint-ignore no-explicit-any
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

export const log: {
  // deno-lint-ignore no-explicit-any
  debug(...args: any[]): void;
  // deno-lint-ignore no-explicit-any
  info(...args: any[]): void;
  // deno-lint-ignore no-explicit-any
  warn(...args: any[]): void;
  // deno-lint-ignore no-explicit-any
  error(...args: any[]): void;
  // deno-lint-ignore no-explicit-any
  failure(data: any): void;
  // deno-lint-ignore no-explicit-any
  success(data: any, noEncode?: boolean): void;
} = {
  debug(...args): void {
    rpcNotify("Debug", { message: getOutput(args) });
  },
  info(...args): void {
    rpcNotify("Info", { message: getOutput(args) });
  },
  warn(...args): void {
    rpcNotify("Warning", { message: getOutput(args) });
  },
  error(...args): void {
    rpcNotify("Error", { message: getOutput(args) });
  },
  failure(data): void {
    rpcNotify("Failure", { data: data });
  },
  success(data, noEncode = false): void {
    if (noEncode) {
      rpcNotify("Success", { data: JSON.parse(data) });
    } else {
      rpcNotify("Success", { data: data });
    }
  },
};

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
  getDeployTarget: (): DeployTarget => rpcRequest("GetDeployTarget") as DeployTarget,
  getDeployData: (typegraph: string): DeployData =>
    rpcRequest<DeployData, { typegraph: string }>(
      "GetDeployData",
      { typegraph },
      false, // Don't transform object keys
    ),
};
