// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { inspect } from "node:util";
// import { createInterface, Interface } from "node:readline";
import process from "node:process";
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

// deno-lint-ignore no-explicit-any
const rpcNotify = (method: RpcNotificationMethod, params: any = null) => {
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

class RpcResponseReader {
  private buffer = "";

  constructor() {
    process.stdin.setEncoding("utf-8");
  }

  read(id: number) {
    return new Promise((resolve, reject) => {
      const handler = () => {
        while (true) {
          const chunk = process.stdin.read();
          if (chunk == null) {
            break;
          }
          this.buffer += chunk;
          const lines = this.buffer.split(/\r\n|\n/);
          if (lines.length > 2) {
            reject(new Error("not sequential"));
          } else if (lines.length <= 1) {
            continue;
          }
          this.buffer = lines.pop()!;

          try {
            const message = JSON.parse(lines[0]);
            if (message.id === id) {
              resolve(message.result);
              break;
            }
          } catch {
            reject("invalid message");
          }
        }
        process.stdin.off("readable", handler);
      };
      process.stdin.on("readable", handler);
    });
  }
}

const rpcCall = (() => {
  const responseReader = new RpcResponseReader();
  let latestRpcId = 0;

  // deno-lint-ignore no-explicit-any
  return (method: string, params: any = null) => {
    const rpcId = latestRpcId++;
    const rpcMessage = JSON.stringify({
      jsonrpc: JSONRPC_VERSION,
      id: rpcId,
      method,
      params,
    });

    writeRpcMessage(rpcMessage);
    return responseReader.read(rpcId);
  };
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
    rpcCall("GetDeployData", { typegraph }) as Promise<DeployData>,
};
