// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { inspect } from "node:util";
// import { createInterface, Interface } from "node:readline";
import process from "node:process";
/**
 * see: module level documentation `meta-cli/src/deploy/actors/task.rs`
 */

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
    const output = getOutput(args);
    process.stdout.write(`debug: ${output}\n`);
  },
  info(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`info: ${output}\n`);
  },
  warn(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`warning: ${output}\n`);
  },
  error(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`error: ${output}\n`);
  },

  failure(data: any) {
    process.stdout.write(`failure: ${JSON.stringify(data)}\n`);
  },
  success(data: any, noEncode = false) {
    const encoded = noEncode ? data : JSON.stringify(data);
    process.stdout.write(`success: ${encoded}\n`);
  },
};

class RpcResponseReader {
  private buffer: string = "";

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
          } catch (e) {
            reject("invalid message");
          }
        }
        process.stdin.off("readable", handler);
      };
      process.stdin.on("readable", handler);
    });
  }
}

const JSONRPC_VERSION = "2.0";

const rpcCall = (() => {
  const responseReader = new RpcResponseReader();
  let latestRpcId = 0;

  return (method: string, params: any = null) => {
    const rpcId = latestRpcId++;
    const rpcMessage = JSON.stringify({
      jsonrpc: JSONRPC_VERSION,
      id: rpcId,
      method,
      params,
    });

    process.stdout.write(`jsonrpc: ${rpcMessage}\n`);
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
