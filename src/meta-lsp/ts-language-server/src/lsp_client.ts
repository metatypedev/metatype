// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import child_process from "node:child_process";
import { JSONRPCEndpoint, LspClient } from "ts-lsp-client";

export function createLspClient(command: string[]): LspClient {
  const child = child_process.spawn(command[0], command.slice(1), {
    stdio: "pipe",
  });
  const endpoint = new JSONRPCEndpoint(child.stdin!, child.stdout!);
  return new LspClient(endpoint);
}
