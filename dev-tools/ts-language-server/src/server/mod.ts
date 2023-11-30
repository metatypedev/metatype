import { LspClient } from "npm:ts-lsp-client";
import { createLspClient } from "../lsp_client.ts";
import {
  Connection,
  createConnection,
  ProposedFeatures,
} from "vscode-languageserver";
import {
  InitializeParams,
  InitializeResult,
} from "vscode-languageserver/types";
import { TextDocumentSyncKind } from "vscode-languageserver/protocol";
import { Documents } from "./documents.ts";

export interface ClientCapabilities {
  configuration: boolean;
  diagnosticRelatedInformation: boolean;
}

export class LspServer {
  guestLspClient?: LspClient;
  connection: Connection;
  documents: Documents;
  clientCapabilities: ClientCapabilities;

  constructor(guestLspClientCommand?: string[]) {
    if (guestLspClientCommand) {
      this.guestLspClient = createLspClient(guestLspClientCommand);
    }
    this.connection = createConnection(ProposedFeatures.all);
    this.clientCapabilities = {
      configuration: false,
      diagnosticRelatedInformation: false,
    };
    this.documents = new Documents(this.clientCapabilities, this.connection);

    this.#setup();
  }

  #setup() {
    this.connection.onInitialize(this.#onInitialize.bind(this));
    this.connection.onInitialized(this.#onInitialized.bind(this));
    this.connection.onDidChangeConfiguration(
      this.#onDidChangeConfiguration.bind(this),
    );
    this.connection.onDidChangeWatchedFiles(() => { });
    // TODO
    this.connection.onCompletion(() => []);
    this.connection.onCompletionResolve((item) => item);
  }

  start() {
    this.documents.start();
    this.connection.listen();
  }

  #onInitialize(params: InitializeParams) {
    const capabilities = params.capabilities;

    this.clientCapabilities.configuration = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );
    this.clientCapabilities.diagnosticRelatedInformation = !!(
      capabilities.textDocument &&
      capabilities.textDocument.publishDiagnostics &&
      capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
        workspaceFolders: {
          supported: false,
        },
      },
    };

    return result;
  }

  #onInitialized() {
    if (this.hasConfigurationCapability) {
      this.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined,
      );
    }
  }

  #onDidChangeConfiguration(change) {
    if (this.clientCapabilities.configuration) {
      // reset all cached document settings
      this.settings.clear();
    } else {
      // TODO what is the key?? "languageServerExample"?
      this.globalSettings = <DocumentSettings>(
        change.settings.languageServerExample || defaultSettings
      );
    }
  }
}
