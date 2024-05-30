// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { inspect } from "node:util";

/**
 * see: module level documentation `meta-cli/src/deploy/actors/task.rs`
 */

function getOutput(args: any[]) {
  return args.map((arg) => {
    if (typeof arg === "string") return arg;
    return inspect(arg, {
      colors: process.stdout.isTTY,
      depth: 10,
      maxStringLength: 1000,
      maxArrayLength: 20,
    });
  }).join(" ");
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
  success(data: any) {
    process.stdout.write(`success: ${JSON.stringify(data)}\n`);
  },
};
