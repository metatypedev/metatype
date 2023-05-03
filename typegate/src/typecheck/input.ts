// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  ArrayNode,
  BooleanNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  UnionNode,
} from "../type_node.ts";
import { TypeGraph } from "../typegraph.ts";
import { EitherNode } from "../types/typegraph.ts";
import * as uuid from "std/uuid/mod.ts";

type ErrorEntry = [path: string, message: string];

interface ValidationContext {
  formatValidators: Record<string, (s: string) => boolean>;
}

const formatValidators = {
  uuid: uuid.validate,
  json: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch (_e) {
      return false;
    }
  },
};

export function generateValidator(tg: TypeGraph, typeIdx: number) {
  const validator = new Function(
    new InputValidationCompiler(tg).generate(typeIdx),
  )() as (
    value: unknown,
    path: string,
    errors: Array<ErrorEntry>,
    context: ValidationContext,
  ) => void;

  return (value: unknown) => {
    const errors: ErrorEntry[] = [];
    validator(value, "v", errors, { formatValidators });
    if (errors.length > 0) {
      const messages = errors.map(([path, msg]) => `  - at ${path}: ${msg}\n`)
        .join("");
      throw new Error(`Validation errors:\n${messages}`);
    }
  };
}

export class InputValidationCompiler {
  codes: Map<number, string> = new Map();
  codegen: CodeGenerator;

  constructor(tg: TypeGraph) {
    this.codegen = new CodeGenerator(tg);
  }

  generate(rootTypeIdx: number): string {
    const queue = [rootTypeIdx];
    const refs = new Set([rootTypeIdx]);
    for (
      let typeIdx = queue.shift();
      typeIdx != null;
      typeIdx = queue.shift()
    ) {
      refs.add(typeIdx);
      if (this.codes.has(typeIdx)) {
        continue;
      }
      const { code, deps } = this.codegen.generate(typeIdx);
      this.codes.set(typeIdx, code);
      queue.push(...deps);
    }

    const rootValidatorName = CodeGenerator.functionName(rootTypeIdx);
    const rootValidator = `\nreturn ${rootValidatorName}`;

    return [...refs].map((idx) => this.codes.get(idx))
      .join("\n") + rootValidator;
  }
}

interface GeneratedCode {
  code: string;
  deps: number[];
}

class CodeGenerator {
  lines: string[] = [];

  constructor(private tg: TypeGraph) {}

  public generate(typeIdx: number): GeneratedCode {
    this.lines = [];
    let deps: number[] = [];
    const typeNode = this.tg.type(typeIdx);
    switch (typeNode.type) {
      case "boolean":
        this.generateBooleanValidator(typeNode);
        break;
      case "number":
      case "integer":
        this.generateNumberValidator(typeNode);
        break;
      case "string":
        this.generateStringValidator(typeNode);
        break;
      case "optional":
        deps = this.generateOptionalValidator(typeNode);
        break;
      case "array":
        deps = this.generateArrayValidator(typeNode);
        break;
      case "object":
        deps = this.generateObjectValidator(typeNode);
        break;
      case "union":
        deps = this.generateUnionValidator(typeNode);
        break;
      case "either":
        deps = this.generateEitherValidator(typeNode);
        break;
      default:
        throw new Error(`Unsupported type: ${typeNode.type}`);
    }

    return { code: this.end(typeIdx), deps };
  }

  generateBooleanValidator(_typeNode: BooleanNode) {
    this.validation(
      'typeof value !== "boolean"',
      "`expected boolean, got ${typeof value}`",
    );
  }

  generateNumberValidator(typeNode: NumberNode | IntegerNode) {
    this.validation(
      'typeof value !== "number"',
      "`expected number, got ${typeof value}`",
    );
    const constraints = [
      ["minimum", "<"],
      ["maximum", ">"],
      ["exclusiveMinimum", "<=", "exclusive minimum"],
      ["exclusiveMaximum", ">=", "exclusive maximum"],
    ] as const;
    for (const c of constraints) {
      const [prop, comp, name = null] = c;
      const constraint = typeNode[prop];
      if (constraint != null) {
        this.line("else");
        this.validation(
          `value ${comp} ${constraint}`,
          `\`expected ${name ?? prop} value: ${constraint}, got \${value}\``,
        );
      }
    }
  }

  private generateStringValidator(typeNode: StringNode) {
    this.validation(
      'typeof value !== "string"',
      "`expected a string, got ${typeof value}`",
    );
    const constraints = [
      ["minLength", "<", "minimum length"],
      ["maxLength", ">", "maximum length"],
    ] as const;
    for (const c of constraints) {
      const [prop, comp, name] = c;
      const constraint = typeNode[prop];
      if (constraint != null) {
        this.line("else");
        this.validation(
          `value.length ${comp} ${constraint}`,
          `\`expected ${name}: ${constraint}, got \${value.length}\``,
        );
      }
    }
    if (typeNode.format != null) {
      this.line("else {");
      this.line(
        `const formatValidator = context.formatValidators["${typeNode.format}"]`,
      );
      this.validation(
        "formatValidator == null",
        `"unknown format '${typeNode.format}'"`,
      );
      this.line("else");
      this.validation(
        "!formatValidator(value)",
        `"string does not statisfy the required format '${typeNode.format}'"`,
      );
      this.line("}");
    }
  }

  private generateOptionalValidator(typeNode: OptionalNode): number[] {
    this.line(`if (value != null) {`);
    this.line(
      `${
        CodeGenerator.functionName(typeNode.item)
      }(value, path, errors, context)`,
    );
    this.line("}");
    return [typeNode.item];
  }

  private generateArrayValidator(typeNode: ArrayNode): number[] {
    this.validation(
      `!Array.isArray(value)`,
      "`expected an array, got ${typeof value}`",
    );
    const constraints = [
      ["minItems", "<", "minimum items"],
      ["maxItems", ">", "maximum items"],
    ] as const;
    for (const c of constraints) {
      const [prop, comp, name] = c;
      const constraint = typeNode[prop];
      if (constraint != null) {
        this.line("else");
        this.validation(
          `value.length ${comp} ${typeNode[prop]}`,
          `\`expected ${name}: ${constraint}, got \${value.length}\``,
        );
      }
    }

    const itemType = typeNode.items;
    const itemValidator = CodeGenerator.functionName(itemType);

    this.line("else {");
    this.line("for (let i = 0; i < value.length; ++i) {");
    this.line("const item = value[i]");
    this.line(
      `${itemValidator}(value[i], path + \`[\${i}]\`, errors, context)`,
    );
    this.line("}");
    this.line("}");

    return [itemType];
  }

  private generateObjectValidator(typeNode: ObjectNode): number[] {
    this.validation(
      `typeof value !== "object"`,
      "`expected an object, got ${typeof value}`",
    );
    this.line("else");
    this.validation(
      `value == null`,
      '"exptected a non-null object, got null"',
    );

    this.line("else {");
    this.line("const keys = new Set(Object.keys(value))");
    for (const [name, typeIdx] of Object.entries(typeNode.properties)) {
      this.line(`keys.delete("${name}")`);
      const validator = CodeGenerator.functionName(typeIdx);
      this.line(
        `${validator}(value["${name}"], path + ".${name}", errors, context)`,
      );
    }

    this.validation(
      "keys.size > 0",
      `\`unexpected fields: \${[...keys].join(', ')}\``,
    );
    this.line("}");
    return Object.values(typeNode.properties);
  }

  private generateUnionValidator(typeNode: UnionNode): number[] {
    this.line("let errs;");
    for (const variantIdx of typeNode.anyOf) {
      this.line(`errs = []`);
      const validator = CodeGenerator.functionName(variantIdx);
      this.line(`${validator}(value, path, errs, context)`);
      this.line("if (errs.length === 0) { return }");
    }
    // TODO display variant errors
    this.line(
      'errors.push([path, "Value does not match to any variant of the union type"])',
    );
    return typeNode.anyOf;
  }

  private generateEitherValidator(typeNode: EitherNode): number[] {
    this.line("let matchCount = 0;");
    this.line("let errs;");

    for (const variantIdx of typeNode.oneOf) {
      this.line(`errs = []`);
      const validator = CodeGenerator.functionName(variantIdx);
      this.line(`${validator}(value, path, errs, context);`);
      this.line("if (errs.length === 0) { matchCount += 1 }");
    }

    this.line("if (matchCount === 0) {");
    this.line(
      'errors.push([path, "Value does not match to any variant of the either type"])',
    );
    this.line("}");
    this.line("else if (matchCount > 1) {");
    this.line(
      'errors.push([path, "Value match to more than one variant of the either type"])',
    );
    this.line("}");

    return typeNode.oneOf;
  }

  private end(typeIdx: number): string {
    const fnName = CodeGenerator.functionName(typeIdx);
    const fnBody = this.lines.join("\n");
    return `function ${fnName}(value, path, errors, context) {\n${fnBody}\n}`;
  }

  private validation(
    errorCond: string,
    errorMsg: string,
    onError: string[] = [],
  ) {
    this.line(`if (${errorCond}) {`);
    this.line(`errors.push([path, ${errorMsg}]);`);
    this.lines.push(...onError);
    this.line("}");
  }

  private line(l: string) {
    this.lines.push(l);
  }

  static functionName(typeIdx: number) {
    return `validate_${typeIdx}`;
  }
}
