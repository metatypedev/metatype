import { Parser } from "../../parser.ts";
import { ModuleDiagnosticsContext } from "../diagnostics/context.ts";
import { asMethodCall } from "./utils/mod.ts";

export type TgTypeName =
  | "integer"
  | "float"
  | "boolean"
  | "string"
  | "struct"
  | "list"
  | "optional"
  | "union"
  | "either"
  | "ref";

// const types: TgTypeName[] = [
//   "integer",
//   "float",
//   "boolean",
//   "string",
//   "struct",
//   "list",
//   "optional",
//   "union",
//   "either",
//   "ref",
// ];

export abstract class SemanticNode {
  protected constructor(public node: Parser.SyntaxNode) { }

  asType(): TgType | null {
    if (this instanceof TgType) {
      return this;
    }
    return null;
  }
}

export type ChildType = {
  key: string;
  type: TgType;
};

export abstract class TgType extends SemanticNode {
  protected constructor(
    private type: TgTypeName,
    public node: Parser.SyntaxNode,
    private children: ChildType[] = [],
    private typeTitle: string | null = null,
  ) {
    super(node);
  }

  toString(): string {
    return `TgType(${this.type}${this.children
      .map((c) => `, ${c.key} => ${c.type.toString()}`)
      .join("")
    })`;
  }

  public static fromNode(
    node: Parser.SyntaxNode,
    ctx: ModuleDiagnosticsContext,
  ): TgType | null {
    if (node.type === "identifier") {
      const variable = ctx.symbolRegistry.findVariable(node);
      if (variable == null) {
        ctx.error(node, `unknown variable: ${node.text}`);
        return null;
      }
      return TgType.fromNode(variable.definition, ctx);
    }

    // TODO if symbol
    if (!node.text.startsWith("t.")) {
      ctx.error(node, "not a type");
      return null;
    }
    if (node.type !== "call_expression") {
      ctx.error(node, "not a type");
      return null;
    }

    const methodCall = asMethodCall(node);
    if (methodCall == null) {
      // TODO function call returning a type??
      ctx.error(node, "not a type");
      return null;
    }

    // TODO check imported symbols, etc.
    if (methodCall.object.text !== "t") {
      // TODO nested call expressions: t.integer().optional()
      ctx.error(node, "not a type");
      return null;
    }

    switch (methodCall.method.text) {
      case "integer": {
        return new TgTypeInteger(node);
      }
      case "float": {
        return new TgTypeFloat(node);
      }
      case "string": {
        return new TgTypeString(node);
      }
      case "struct": {
        const args = methodCall.arguments;
        if (args.namedChildren.length === 0) {
          return new TgTypeStruct(node, []);
        }
        if (args.namedChildren.length > 1) {
          ctx.error(args, "too many arguments");
          return null;
        }
        // TODO
        const arg = args.namedChildren[0];

        const props: ChildType[] = [];
        for (const child of arg.namedChildren) {
          if (child.type !== "pair" || child.namedChildren.length !== 2) {
            ctx.error(child, "could not parse: not a pair");
            return null;
          }
          const keyNode = child.namedChildren[0];
          // if (keyNode == null) {
          //   ctx.error(child, "could not parse: key not found");
          //   console.error("child", child.toString());
          //   return null;
          // }
          if (keyNode.type !== "string") {
            ctx.error(keyNode, "key must be a string");
            return null;
          }
          const key = keyNode.text;

          const valueNode = child.namedChildren[1];
          // if (valueNode == null) {
          //   ctx.error(node, "could not parse: value not found");
          //   console.error("child", child.toString());
          //   console.error(
          //     "children",
          //     child.namedChildren.map((c) => [c.text, c.toString()]),
          //   );
          //   return null;
          // }
          const value = TgType.fromNode(valueNode, ctx);

          if (value == null) {
            return null;
          }
          props.push({ key, type: value });
        }

        return new TgTypeStruct(node, props);
      }
      default: {
        ctx.error(node, `unknown type: t.${methodCall.method.text}`);
        return null;
      }
    }
  }
}

export class TgTypeRef extends TgType {
  constructor(
    public name: string,
    node: Parser.SyntaxNode,
    target: TgType | null, // TODO: target not found -> emit error
  ) {
    const children: ChildType[] = [];
    if (target !== null) {
      children.push({ key: "[target]", type: target });
    }
    super("ref", node, children);
  }
}

export class TgTypeInteger extends TgType {
  constructor(node: Parser.SyntaxNode) {
    super("integer", node);
  }
}

export class TgTypeFloat extends TgType {
  constructor(node: Parser.SyntaxNode) {
    super("float", node);
  }
}

export class TgTypeString extends TgType {
  constructor(node: Parser.SyntaxNode) {
    super("string", node);
  }
}

export class TgTypeStruct extends TgType {
  constructor(node: Parser.SyntaxNode, fields: ChildType[]) {
    super("struct", node, fields);
  }
}
