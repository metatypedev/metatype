import { join } from "node:path";
import { ExtensionContext } from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverDir = context.asAbsolutePath(join("ts-language-server"));
  const serverModule = context.asAbsolutePath(join("ts-language-server", "out", "server.js"));
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule, transport: TransportKind.ipc,
    },
    debug: {
      command: "pnpm",
      args: "tsx src/server.ts --ipc",
      options: {
        cwd: serverDir,
      },
    },
    command: "deno",
    args: ["run", "-A", "src/server.ts", "--stdio"],
    options: {
      cwd: tsServerDir,
    },
    transport: TransportKind.stdio,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "typescript" }],
  };

  client = new LanguageClient(
    "typegraphTsClient",
    "Typegraph TypeScript Client",
    serverOptions,
    clientOptions,
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
