import { ScopeManager } from "./scope.ts";
import { SymbolSemantics } from "./symbol-semantics.ts";

type VariableKind = "let" | "const" | "var" | "import";

export abstract class Symbol {
  semantics: SymbolSemantics | null = null;
  constructor(
    public name: string,
    public node: Parser.SyntaxNode,
    private scopeManager: ScopeManager,
  ) { }
}

export class ImportSymbol extends Symbol {
  constructor(scopeManager: ScopeManager, node: Parser.SyntaxNode) {
    super(node.text, node, scopeManager);
  }
}

export class Variable {
  protected constructor(
    public kind: VariableKind,
    public node: Parser.SyntaxNode,
    public name: string,
    public definition: Parser.SyntaxNode,
    public scope: Scope,
  ) {
  }
}

export class Import extends Variable {
  constructor(
    node: Parser.SyntaxNode,
    name: string,
    definition: Parser.SyntaxNode,
    scope: Scope,
  ) {
    super("import", node, name, definition, scope);
  }
}
