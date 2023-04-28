// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  ArrayNode,
  EitherNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  Type,
  UnionNode,
} from "../../type_node.ts";
import { TypeGraph } from "../../typegraph.ts";

export type PathSegment = string | number;

export interface ValueShift {
  path: string;
  ref: string;
}

export interface ValidationNode {
  kind: "validation";
  prepare?: string[];
  shift?: ValueShift;
  condition: (valRef: string) => string;
  error: (valRef: string) => string;
  collectErrorsIn?: string;
  next: Array<Node>;
}

export interface BranchNode {
  kind: "branch";
  shift?: ValueShift;
  condition: (val: string) => string;
  yes: Array<Node>;
  no: Array<Node>;
}

export interface LoopNode {
  kind: "loop";
  shift?: ValueShift;
  iterationCount: (valueRef: string) => string;
  iterationVariable: string;
  nodes: Node[];
}

export type Node = BranchNode | ValidationNode | LoopNode;

type ValidationNodeInit = Omit<ValidationNode, "kind" | "next">;

function validationNode(init: ValidationNodeInit): ValidationNode {
  return {
    ...init,
    kind: "validation",
    next: [],
  };
}

type BuildParams = Pick<
  ValidationNode,
  "shift" | "prepare" | "collectErrorsIn"
>;

export function createValidationGraph(
  tg: TypeGraph,
  typeIdx: number,
): Node {
  return new ValidationGraphBuilder(tg).buildObject(
    tg.type(typeIdx, Type.OBJECT),
    {},
  );
}

class ValidationGraphBuilder {
  varNameGenerator = (function* () {
    for (let i = 0; true; ++i) yield `_a${i}`;
  })();

  nextVarName() {
    const res = this.varNameGenerator.next();
    if (res.done) {
      throw new Error("Unexpected");
    }
    return res.value;
  }

  constructor(private tg: TypeGraph) {}

  build(typeIdx: number, params: BuildParams = {}): Node[] {
    const typeNode = this.tg.type(typeIdx);
    switch (typeNode.type) {
      case Type.OPTIONAL:
        return [this.buildOptional(typeNode, params)];
      case Type.NUMBER:
      case Type.INTEGER:
        return [this.buildNumber(typeNode, params)];
      case Type.STRING:
        return [this.buildString(typeNode, params)];
      // case Type.BOOLEAN:
      //   return this.buildBoolean(typeNode, shift);
      case Type.ARRAY:
        return [this.buildArray(typeNode, params)];
      case Type.OBJECT:
        return [this.buildObject(typeNode, params)];
      case Type.UNION:
        return this.buildUnion(typeNode, params);
      case Type.EITHER:
        return this.buildEither(typeNode, params);
      default:
        throw new Error("Type not supported");
    }
  }

  buildOptional(typeNode: OptionalNode, params: BuildParams): Node {
    return {
      kind: "branch",
      ...params,
      condition: (v) => `${v} == null`,
      yes: [],
      no: [
        ...this.build(typeNode.item, {
          collectErrorsIn: params.collectErrorsIn,
        }),
      ],
    };
  }

  buildNumber(typeNode: NumberNode | IntegerNode, params: BuildParams): Node {
    const root = validationNode({
      ...params,
      condition: (v) => `typeof ${v} === "number"`,
      error: (v) => `\`expected number, got \${typeof ${v}}\``,
    });

    let node = root; // leaf node on which new nodes will be attatched
    const constraints = [
      ["minimum", ">=", "minimum"],
      ["maximum", "<=", "maximum"],
      ["exclusiveMinimum", ">", "exclusive minimum"],
      ["exclusiveMaximum", "<", "exclusive maximum"],
    ] as const;

    for (const [key, compare, name] of constraints) {
      if (typeNode[key] != null) {
        const next = validationNode({
          collectErrorsIn: params.collectErrorsIn,
          condition: (v) => `${v} ${compare} ${typeNode[key]}`,
          error: (v) =>
            `\`expected ${name} value: ${typeNode[key]} , got ${v}\``,
        });
        node.next.push(next);
        node = next;
      }
    }

    return root;
  }

  buildString(typeNode: StringNode, params: BuildParams): Node {
    const root = validationNode({
      ...params,
      condition: (v) => `typeof ${v} === "string"`,
      error: (v) => `\`expected string, got \${typeof ${v}}\``,
    });

    const constraints = [
      ["minLength", ">=", "minimum length"],
      ["maxLength", "<=", "maximum length"],
    ] as const;

    let node = root; // leaf node on which new nodes will be attatched
    for (const [key, compare, name] of constraints) {
      if (typeNode[key] != null) {
        const next = validationNode({
          condition: (v) => `${v}.length ${compare} ${typeNode[key]}`,
          error: (v) =>
            `\`expected ${name}: ${typeNode[key]}, got \${${v}.length}\``,
          collectErrorsIn: params.collectErrorsIn,
        });
        node.next.push(next);
        node = next;
      }
    }

    if (typeNode.format != null) {
      // TODO check if format is a known format
      const next = validationNode({
        condition: (v) => `formatValidators["${typeNode.format}"](${v})`,
        error: (_v) =>
          `\`string format constraint "${typeNode.format}" not satisfied\``,
        collectErrorsIn: params.collectErrorsIn,
      });
      node.next.push(next);
      node = next;
    }

    return root;
  }

  buildArray(
    typeNode: ArrayNode,
    params: BuildParams,
  ): Node {
    const root = validationNode({
      ...params,
      condition: (v) => `Array.isArray(${v})`,
      error: (v) => `\`expected array, but got \${typeof ${v}}\``,
    });

    const constraints = [
      ["minItems", ">=", "minimum item count"],
      ["maxItems", "<=", "maximum item count"],
    ] as const;

    let leaf = root;
    for (const [key, compare, name] of constraints) {
      if (typeNode[key] != null) {
        const next = validationNode({
          condition: (v) => `${v}.length ${compare} ${typeNode[key]}`,
          error: (v) =>
            `\`expected ${name}: ${typeNode[key]}, got \${${v}.length}\``,
          collectErrorsIn: params.collectErrorsIn,
        });
        leaf.next.push(next);
        leaf = next;
      }
    }

    const iterationVariable = this.nextVarName();

    leaf.next.push({
      kind: "loop",
      iterationCount: (v) => `${v}.length`,
      iterationVariable,
      nodes: this.build(typeNode.items, {
        shift: {
          ref: `[${iterationVariable}]`,
          path: `[\${${iterationVariable}}]`,
        },
        collectErrorsIn: params.collectErrorsIn,
      }),
    });

    return root;
  }

  buildObject(typeNode: ObjectNode, params: BuildParams): Node {
    const root = validationNode({
      ...params,
      condition: (v) => `typeof ${v} === "object"`,
      error: (v) => `\`expected object, but got \${typeof ${v}}\``,
    });

    const next = validationNode({
      condition: (v) => `${v} !== null`,
      error: (_v) => '"Expected non-null object, but got null"',
      collectErrorsIn: params.collectErrorsIn,
    });
    root.next.push(next);
    for (const [name, type] of Object.entries(typeNode.properties)) {
      // TODO what if `name` contains '"'
      next.next.push(
        ...this.build(type, {
          shift: { ref: `["${name}"]`, path: `.${name}` },
          collectErrorsIn: params.collectErrorsIn,
        }),
      );
    }
    // TODO additionalProperties
    return root;
  }

  buildUnion(typeNode: UnionNode, params: BuildParams): Node[] {
    if (typeNode.anyOf.length < 2) {
      throw new Error("Unexpected: union has less than two variants");
    }

    const { collectErrorsIn, ...restParams } = params;

    const errorsVariable = this.nextVarName();
    const shiftVariants = (variants: number[], first = false): Node[] => {
      const [typeIdx, ...rest] = variants;
      const res: Node[] = [];
      res.push(...this.build(typeIdx, {
        prepare: [`${first ? "let " : ""}${errorsVariable} = []`],
        collectErrorsIn: errorsVariable,
        ...(first ? restParams : {}),
      }));
      if (rest.length === 0) {
        res.push(validationNode({
          condition: () => `${errorsVariable}.length === 0`,
          error: () => '"The value matches none of the union variants"',
          collectErrorsIn,
        }));
      } else {
        res.push({
          kind: "branch",
          condition: () => `${errorsVariable}.length === 0`,
          yes: [],
          no: shiftVariants(rest),
        });
      }

      return res;
    };

    return shiftVariants(typeNode.anyOf, true);
  }

  buildEither(typeNode: EitherNode, params: BuildParams): Node[] {
    if (typeNode.oneOf.length < 2) {
      throw new Error("Unexpected: either has less than two variants");
    }

    const { collectErrorsIn, prepare = [], ...buildParams } = params;

    const errorVars: string[] = [];
    const res: Node[] = [];
    for (const variantIdx of typeNode.oneOf) {
      const errVar = this.nextVarName();
      errorVars.push(errVar);
      res.push(...this.build(variantIdx, {
        prepare: [...prepare, `const ${errVar} = []`],
        collectErrorsIn: errVar,
        ...buildParams,
      }));
    }

    const varErrArrays = this.nextVarName();
    const varSuccessCount = this.nextVarName();
    const variantMessage =
      `\`For variant #\${i}: \${errs.map(([p, msg]) => msg).join("; ")}\``;
    const collectedErrors =
      `\${${varErrArrays}.map((errs, i) => ${variantMessage}).join(". ")}`;
    res.push(validationNode({
      prepare: [
        `const ${varErrArrays} = [${errorVars.join(", ")}]`,
        `const ${varSuccessCount} = ${varErrArrays}.filter(errs => errs.length === 0).length`,
      ],
      condition: () => `${varSuccessCount} === 1`,
      error: () =>
        [
          `${varSuccessCount} > 1`,
          `? \`The value satisfied more than one variants (\${${varSuccessCount}}) of the either\``,
          `: \`The value satisfied none of the either variants (${collectedErrors})\``,
        ].join(" "),
      collectErrorsIn,
    }));

    return res;
  }
}
