import * as path from "path";
import { ExtensionContext, workspace } from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(_context: ExtensionContext) {
  const tsServerDir = context.asAbsolutePath(
    path.join("..", "ts-language-server"),
  );
  const serverOptions: ServerOptions = {
    run: {
      command: "typegraph-ts-server",
      args: ["--stdio"],
      transport: TransportKind.stdio,
    },
    debug: {
      command: "node",
      args: ["out/server.js", "--stdio"],
      options: {
        cwd: tsServerDir,
      },
      transport: TransportKind.stdio,
    },
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
