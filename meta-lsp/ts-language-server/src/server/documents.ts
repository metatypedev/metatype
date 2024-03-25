import { Connection, TextDocuments } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ClientCapabilities } from "./mod.ts";
import { findTypegraphDefinitions, Parser, TypeScript } from "../parser.ts";
import { ModuleDiagnosticsContext } from "../analysis/diagnostics/context.ts";

// TODO settings?
type DocumentSettings = Record<string, never>;
const defaultSettings: DocumentSettings = {};

export class Documents {
  documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  settings: Map<string, Thenable<DocumentSettings>> = new Map();
  globalSettings = defaultSettings;

  constructor(
    private clientCapabilities: ClientCapabilities,
    private connection: Connection,
  ) {
    this.#setup();
  }

  start() {
    this.documents.listen(this.connection);
  }

  #setup() {
    this.documents.onDidClose((e) => {
      this.settings.delete(e.document.uri);
    });

    this.documents.onDidChangeContent((change) => {
      this.#validateDocument(change.document);
    });
  }

  revalidateAll() {
    for (const document of this.documents.all()) {
      this.#validateDocument(document);
    }
  }

  getSettings(resource: string): Thenable<DocumentSettings> {
    if (!this.clientCapabilities.configuration) {
      return Promise.resolve(this.globalSettings);
    }

    let result = this.settings.get(resource);
    if (!result) {
      result = this.connection.workspace.getConfiguration({
        scopeUri: resource,
        section: "typegraphTsServer", // TODO global constant
      });
      this.settings.set(resource, result);
    }

    return result;
  }

  #validateDocument(textDocument: TextDocument) {
    const parser = new Parser();
    parser.setLanguage(TypeScript);

    const tree = parser.parse(textDocument.getText());
    const rootNode = tree.rootNode;
    const diagnosticContext = new ModuleDiagnosticsContext(
      rootNode,
      textDocument.uri,
    );

    const typegraphDefs = findTypegraphDefinitions(rootNode);

    for (const def of typegraphDefs) {
      diagnosticContext.checkTypegraph(def);
    }

    this.connection.sendDiagnostics({
      uri: textDocument.uri,
      diagnostics: diagnosticContext.diagnostics,
    });
  }
}
