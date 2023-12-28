import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/types";
import { ScopeManager } from "../typescript-semantic/scope.ts";
import {
  Parser,
  TypegraphDefinition,
  TypegraphDefinitionCaptures,
} from "../../parser.ts";
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

  public checkTypegraph(def: TypegraphDefinitionCaptures) {
    const typegraphDef = TypegraphDefinition.create(def, this);

    if (typegraphDef == null) {
      return;
    }

    for (const [name, exposedFunction] of typegraphDef.exposedFunctions) {
      const input = exposedFunction.input;
      if (input && !(input.type instanceof TgTypeStruct)) {
        this.error(
          input?.spec ?? exposedFunction.node,
          `Exposed function '${name}': expected input type to be a struct but got ${input?.type}`,
        );
      }
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
