import child_process from "node:child_process";
import { JSONRPCEndpoint, LspClient } from "npm:ts-lsp-client";

export function createLspClient(command: string[]): LspClient {
  const child = child_process.spawn(command[0], command.slice(1), {
    stdio: "pipe",
  });
  const endpoint = new JSONRPCEndpoint(child.stdin!, child.stdout!);
  return new LspClient(endpoint);
}
