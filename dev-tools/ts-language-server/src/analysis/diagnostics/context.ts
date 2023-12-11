// import { Diagnostic } from "vscode-languageserver";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/types";
import { ScopeManager } from "../typescript-semantic/scope.ts";
import { Parser } from "../../parser.ts";
import { ExposedFunction } from "../exposed_function.ts";
import { TgTypeStruct } from "../typescript-semantic/semantic-node.ts";

export class ModuleDiagnosticsContext {
  symbolRegistry: ScopeManager;
  diagnostics: Diagnostic[] = [];

  constructor(rootNode: Parser.SyntaxNode, private uri: string) {
    this.symbolRegistry = new ScopeManager(rootNode);
  }

  #pushDiagnostic(
    severity: DiagnosticSeverity,
    node: Parser.SyntaxNode,
    message: string,
  ) {
    this.diagnostics.push({
      severity,
      message,
      range: {
        start: {
          line: node.startPosition.row,
          character: node.startPosition.column,
        },
        end: {
          line: node.endPosition.row,
          character: node.endPosition.column,
        },
      },
      source: "typegraph",
    });
  }

  checkExposedFunction(exposedFunction: ExposedFunction) {
    const inputType = exposedFunction.inputType;
    if (!(inputType instanceof TgTypeStruct)) {
      this.error(
        exposedFunction.node,
        `Input type of exposed function must be a struct, but got ${inputType}`,
      );
    }
  }

  error(node: Parser.SyntaxNode, message: string) {
    this.#pushDiagnostic(DiagnosticSeverity.Error, node, message);
  }

  warn(node: Parser.SyntaxNode, message: string) {
    this.#pushDiagnostic(DiagnosticSeverity.Warning, node, message);
  }

  info(node: Parser.SyntaxNode, message: string) {
    this.#pushDiagnostic(DiagnosticSeverity.Information, node, message);
  }

  hint(node: Parser.SyntaxNode, message: string) {
    this.#pushDiagnostic(DiagnosticSeverity.Hint, node, message);
  }
}
