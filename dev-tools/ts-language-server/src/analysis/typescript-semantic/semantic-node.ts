import { Parser } from "../../parser.ts";
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

const types: TgTypeName[] = [
  "integer",
  "float",
  "boolean",
  "string",
  "struct",
  "list",
  "optional",
  "union",
  "either",
  "ref",
];

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

  public static fromNode(node: Parser.SyntaxNode): TgType {
    if (!node.text.startsWith("t.")) {
      throw new Error("not a type");
    }
    if (node.type !== "call_expression") {
      throw new Error("not a type");
    }

    const methodCall = asMethodCall(node);
    if (methodCall == null) {
      // TODO function call returning a type??
      throw new Error("not a type");
    }

    // TODO check imported symbols, etc.
    if (methodCall.object.text !== "t") {
      // TODO nested call expressions: t.integer().optional()
      throw new Error("not a type");
    }

    switch (methodCall.method) {
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
          // TODO
          throw new Error("struct takes only one argument");
        }
        // TODO
        const arg = args.namedChildren[0];
        const props = arg.namedChildren.map((node) => {
          const keyNode = node.childForFieldName("key");
          if (keyNode == null) {
            throw new Error("key not found");
          }
          if (keyNode.type !== "string") {
            throw new Error("key is not a string");
          }
          const key = keyNode.text;

          const valueNode = node.childForFieldName("value");
          if (valueNode == null) {
            throw new Error("value not found");
          }
          const value = TgType.fromNode(valueNode);
          return { key, type: value } as ChildType;
        });

        // for (const child of arg.namedChildren) {
        //   console.log("t.struct argument", child.toString());
        // }

        return new TgTypeStruct(node, props);
      }
      default: {
        throw new Error(`unknown type t.${methodCall.method}`);
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
    super("integer", node);
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
