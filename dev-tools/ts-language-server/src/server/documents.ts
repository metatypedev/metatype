import { Connection, Diagnostic, TextDocuments } from "vscode-languageserver";
import { DiagnosticSeverity } from "vscode-languageserver/types";
import { TextDocument } from "vscode-languageserver/textdocument";
import { ClientCapabilities } from "./mod.ts";

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
    const text = textDocument.getText();
    const pattern = /\.apply\(/g;
    let match: RegExpExecArray | null;

    const diagnostics: Diagnostic[] = [];

    while ((match = pattern.exec(text)) && match != null) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(match.index),
          end: textDocument.positionAt(match.index + match[0].length),
        },
        message: `Found .apply()`,
        source: "ex", // what?
      };

      if (this.clientCapabilities.diagnosticRelatedInformation) {
        diagnostic.relatedInformation = [
          {
            location: {
              uri: textDocument.uri,
              range: Object.assign({}, diagnostic.range),
            },
            message: "Found .apply()",
          },
        ];
      }

      diagnostics.push(diagnostic);
    }

    this.connection.sendDiagnostics({
      uri: textDocument.uri,
      diagnostics,
    });
  }
}
