import { Parser, TypeScript } from "../../parser.ts";

type VariableDeclarationKeyword = "let" | "const" | "var" | "import";

type Variable = {
  keyword: VariableDeclarationKeyword;
  node: Parser.SyntaxNode;
  name: string;
  definition: Parser.SyntaxNode;
  scope: Scope;
};

const blockQuery = TypeScript.query(`
(statement_block) @block
`);

export class Scope {
  children: Scope[] = [];
  variables: Variable[] = [];

  constructor(
    public node: Parser.SyntaxNode,
    public parent: Scope | null,
    private scopeManager: ScopeManager,
  ) {
    // 1. find child scopes
    // 2. find variables

    const subBlocks: Parser.SyntaxNode[] = [];

    for (const child of node.namedChildren) {
      const blockMatches = blockQuery.matches(child);
      for (const match of blockMatches) {
        const block = match.captures[0].node;
        if (subBlocks.length === 0) {
          subBlocks.push(block);
        } else {
          const lastBlock = subBlocks[subBlocks.length - 1];
          // TODO: check if block is a child of lastBlock; with the hypothesis that tree-sitter does a DFS
          if (block.endPosition.row > lastBlock.endPosition.row) {
            // block is not a child of lastBlock
            subBlocks.push(block);
          } else {
            console.warn("skipped nested subblock", block);
          }
        }
      }

      switch (child.type) {
        case "variable_declaration": {
          throw new Error("todo");
        }
        case "lexical_declaration": {
          const keyword = child.childForFieldName("kind")!
            .text as VariableDeclarationKeyword;
          for (const declarator of child.namedChildren) {
            if (declarator.type === "variable_declarator") {
              const name = declarator.childForFieldName("name")!;
              if (name.type !== "identifier") {
                console.warn("unsupported variable declaration:", name.type);
              } else {
                const initializer = declarator.childForFieldName("value");
                if (initializer) {
                  this.addVariable({
                    keyword,
                    node: child,
                    name: name.text,
                    definition: initializer,
                    scope: this,
                  });
                } else {
                  console.warn("uninitialized variable:", name.text);
                }
              }
            }
          }
          break;
        }
      }
    }

    for (const subblock of subBlocks) {
      const scope = new Scope(subblock, this, scopeManager);
      this.children.push(scope);
      // scopeManager.scopes.set(subblock, scope);
    }
  }

  addVariable(variable: Variable) {
    this.variables.push(variable);
    const list = this.scopeManager.variables.get(variable.name);
    if (list) {
      list.push(variable);
    } else {
      this.scopeManager.variables.set(variable.name, [variable]);
    }
  }
}

export class ScopeManager {
  // TODO order??
  variables: Map<string, Variable[]> = new Map();
  rootScope: Scope;

  constructor(rootNode: Parser.SyntaxNode) {
    this.rootScope = new Scope(rootNode, null, this);
  }

  // identifier node
  findVariable(node: Parser.SyntaxNode): Variable | null {
    if (node.type !== "identifier") {
      throw new Error("not an identifier");
    }
    const name = node.text;
    const list = this.variables.get(name);
    if (list) {
      if (list.length > 1) {
        // TODO check scope
        throw new Error("multiple variables with the same name");
      }
      return list[0];
    }
    return null;
  }

  // getScope(node: Parser.SyntaxNode): Scope {
  //   const scope = this.scopes.get(node);
  //   if (scope) {
  //     return scope;
  //   }
  //
  //   const parentScope = this.getScope(node.parent);
  //   const newScope: Scope = {
  //     parent: parentScope,
  //     variables: new Map(),
  //     node,
  //   };
  //   this.scopes.set(node, newScope);
  //   return newScope;
  // }
  //
  // getVariable(
  //   scope: Scope,
  //   name: string,
  // ): Variable | undefined {
  //   const variable = scope.variables.get(name);
  //   if (variable) {
  //     return variable;
  //   }
  //
  //   if (scope.parent) {
  //     return this.getVariable(scope.parent, name);
  //   }
  //
  //   return undefined;
  // }
  //
  // addVariable(
  //   scope: Scope,
  //   keyword: VariableDeclarationKeyword,
  //   node: Parser.SyntaxNode,
  //   name: string,
  //   definition: Parser.SyntaxNode,
  // ) {
  //   const variable: Variable = {
  //     keyword,
  //     node,
  //     name,
  //     definition,
  //   };
  //   scope.variables.set(name, variable);
  // }
}
