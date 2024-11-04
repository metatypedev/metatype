// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { inspect } from "node:util";
// import { createInterface, Interface } from "node:readline";
import process from "node:process";
import { rpcRequest } from "./gen/client.ts";
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
    rpcRequest<DeployData, { typegraph: string }>("GetDeployData", {
      typegraph,
    }),
};
