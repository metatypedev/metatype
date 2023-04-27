// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  ArrayNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  Type,
} from "../../type_node.ts";
import { TypeGraph } from "../../typegraph.ts";

export type PathSegment = string | number;

export interface ValidationNode {
  kind: "validation";
  pathSuffix: string;
  condition: (valRef: string) => string;
  error: (valRef: string) => string;
  next: Array<Node>;
}

export interface BranchNode {
  kind: "branch";
  pathSuffix: string;
  condition: (val: string) => string;
  yes: Array<Node>;
  no: Array<Node>;
}

export interface LoopNode {
  kind: "loop";
  pathSuffix: string;
  iterationCount: (valueRef: string) => string;
  iterationVariable: string;
  nextNodes: Node;
}

export type Node = BranchNode | ValidationNode | LoopNode;

type ValidationNodeInit = Pick<
  ValidationNode,
  "pathSuffix" | "condition" | "error"
>;

function validationNode(init: ValidationNodeInit): ValidationNode {
  return {
    ...init,
    kind: "validation",
    next: [],
  };
}

export function createValidationGraph(
  tg: TypeGraph,
  typeIdx: number,
): Node {
  return new ValidationGraphBuilder(tg).buildObject(
    tg.type(typeIdx, Type.OBJECT),
    "",
  );
}

class ValidationGraphBuilder {
  iterVarNameGenerator = (function* () {
    for (let i = 0; true; ++i) yield `_i${i}`;
  })();

  nextIterVarName() {
    const res = this.iterVarNameGenerator.next();
    if (res.done) {
      throw new Error("Unexpected");
    }
    return res.value;
  }

  constructor(private tg: TypeGraph) {}

  build(typeIdx: number, pathSuffix: string): Node {
    const typeNode = this.tg.type(typeIdx);
    switch (typeNode.type) {
      case Type.OPTIONAL:
        return this.buildOptional(typeNode, pathSuffix);
      case Type.NUMBER:
      case Type.INTEGER:
        return this.buildNumber(typeNode, pathSuffix);
      case Type.STRING:
        return this.buildString(typeNode, pathSuffix);
      // case Type.BOOLEAN:
      //   return this.buildBoolean(typeNode, pathSuffix);
      case Type.ARRAY:
        return this.buildArray(typeNode, pathSuffix);
      case Type.OBJECT:
        return this.buildObject(typeNode, pathSuffix);
      default:
        throw new Error("Type not supported");
    }
  }

  buildOptional(typeNode: OptionalNode, pathSuffix: string): Node {
    return {
      kind: "branch",
      pathSuffix,
      condition: (v) => `${v} == null`,
      yes: [],
      no: [this.build(typeNode.item, pathSuffix)],
    };
  }

  buildNumber(
    typeNode: NumberNode | IntegerNode,
    pathSuffix: string,
  ): Node {
    const root: ValidationNode = {
      kind: "validation",
      pathSuffix,
      condition: (v) => `typeof ${v} === "number"`,
      error: (v) => `\`expected number, got \${typeof ${v}}\``,
      next: [],
    };

    let node = root; // leaf node on which new nodes will be attatched
    const constraints = [
      ["minimum", ">=", "minimum"],
      ["maximum", "<=", "maximum"],
      ["exclusiveMinimum", ">", "exclusive minimum"],
      ["exclusiveMaximum", "<", "exclusive maximum"],
    ] as const;

    for (const [key, compare, name] of constraints) {
      if (typeNode[key] != null) {
        const next: ValidationNode = {
          kind: "validation",
          pathSuffix: "",
          condition: (v) => `${v} ${compare} ${typeNode[key]}`,
          error: (v) =>
            `\`expected ${name} value: ${typeNode[key]} , got ${v}\``,
          next: [],
        };
        node.next.push(next);
        node = next;
      }
    }

    return root;
  }

  buildString(
    typeNode: StringNode,
    pathSuffix: string,
  ): Node {
    const root: ValidationNode = {
      kind: "validation",
      pathSuffix,
      condition: (v) => `typeof ${v} === "string"`,
      error: (v) => `\`expected string, got \${typeof ${v}}\``,
      next: [],
    };

    const constraints = [
      ["minLength", ">=", "minimum length"],
      ["maxLength", "<=", "maximum length"],
    ] as const;

    let node = root; // leaf node on which new nodes will be attatched
    for (const [key, compare, name] of constraints) {
      if (typeNode[key] != null) {
        const next: ValidationNode = {
          kind: "validation",
          pathSuffix: "",
          condition: (v) => `${v}.length ${compare} ${typeNode[key]}`,
          error: (v) =>
            `\`expected ${name}: ${typeNode[key]}, got \${${v}.length}\``,
          next: [],
        };
        node.next.push(next);
        node = next;
      }
    }

    if (typeNode.format != null) {
      // TODO check if format is a known format
      const next = validationNode({
        pathSuffix: "",
        condition: (v) => `formatValidators["${typeNode.format}"](${v})`,
        error: (_v) =>
          `\`string format constraint "${typeNode.format}" not satisfied\``,
      });
      node.next.push(next);
      node = next;
    }

    return root;
  }

  buildArray(
    typeNode: ArrayNode,
    pathSuffix: string,
  ): Node {
    const root = validationNode({
      condition: (v) => `typeof ${v} === "array"`,
      pathSuffix,
      error: (v) => `\`expected array, but got \${typeof ${v}}\``,
    });

    // TODO constraints

    const iterationVariable = this.nextIterVarName();

    root.next.push({
      kind: "loop",
      pathSuffix: "",
      iterationCount: (v) => `${v}.length`,
      iterationVariable,
      nextNodes: this.build(typeNode.items, `[${iterationVariable}]`),
    });

    return root;
  }

  buildObject(
    typeNode: ObjectNode,
    pathSuffix: string,
  ): Node {
    const root = validationNode({
      pathSuffix,
      condition: (v) => `typeof ${v} === "object"`,
      error: (v) => `\`expected object, but got \${typeof ${v}}\``,
    });

    const next = validationNode({
      pathSuffix: "",
      condition: (v) => `${v} !== null`,
      error: (_v) => '"Expected non-null object, but got null"',
    });
    root.next.push(next);
    for (const [name, type] of Object.entries(typeNode.properties)) {
      // TODO what if `name` contains '"'
      next.next.push(this.build(type, `["${name}"]`));
    }
    return root;
  }
}
