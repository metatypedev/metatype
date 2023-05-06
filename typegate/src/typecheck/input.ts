// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  ArrayNode,
  BooleanNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  Type,
  UnionNode,
} from "../type_node.ts";
import { TypeGraph } from "../typegraph.ts";
import { EitherNode, StringFormat, TypeNode } from "../types/typegraph.ts";
import * as uuid from "std/uuid/mod.ts";
import validator from "npm:validator";
import lodash from "npm:lodash";

type ErrorEntry = [path: string, message: string];

type FormatValidator = (value: string) => boolean;

interface ValidationContext {
  formatValidators: Record<StringFormat, FormatValidator>;
  deepEqual: <T>(left: T, right: T) => boolean;
}

const formatValidators: Record<StringFormat, FormatValidator> = {
  uuid: uuid.validate,
  json: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch (_e) {
      return false;
    }
  },
  email: validator.isEmail,
  // TODO validatorjs does not have a URI validator, so this is stricter than expected
  uri: (value: string) =>
    validator.isURL(value, {
      require_valid_protocol: false,
      require_host: false,
    }),
  // TODO
  hostname: validator.isFQDN,
  ean: validator.isEAN,
  phone: validator.isMobilePhone, // ??
  date: validator.isDate,
  // datetime: ??
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
    validator(value, "<value>", errors, {
      formatValidators,
      deepEqual: lodash.isEqual,
    });
    if (errors.length > 0) {
      const messages = errors.map(([path, msg]) => `  - at ${path}: ${msg}\n`)
        .join("");
      throw new Error(`Validation errors:\n${messages}`);
    }
  };
}

function functionName(typeIdx: number) {
  return `validate_${typeIdx}`;
}

export class InputValidationCompiler {
  codes: Map<number, string> = new Map();

  constructor(private tg: TypeGraph) {}

  generate(rootTypeIdx: number): string {
    const cg = new CodeGenerator();
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
      const typeNode = this.tg.type(typeIdx);

      if (typeNode.enum != null) {
        cg.generateEnumValidator(typeNode);
      } else {
        switch (typeNode.type) {
          case "boolean":
            cg.generateBooleanValidator(typeNode);
            break;
          case "number":
          case "integer":
            cg.generateNumberValidator(typeNode);
            break;
          case "string":
            cg.generateStringValidator(typeNode);
            break;
          case "optional":
            cg.generateOptionalValidator(typeNode);
            queue.push(typeNode.item);
            break;
          case "array":
            cg.generateArrayValidator(typeNode);
            queue.push(typeNode.items);
            break;
          case "object":
            cg.generateObjectValidator(typeNode);
            queue.push(...Object.values(typeNode.properties));
            break;
          case "union":
            cg.generateUnionValidator(typeNode);
            queue.push(...typeNode.anyOf);
            break;
          case "either":
            cg.generateEitherValidator(typeNode);
            queue.push(...typeNode.oneOf);
            break;
          default:
            throw new Error(`Unsupported type: ${typeNode.type}`);
        }
      }

      const fnName = functionName(typeIdx);
      const fnBody = cg.reset().join("\n");
      this.codes.set(
        typeIdx,
        `function ${fnName}(value, path, errors, context) {\n${fnBody}\n}`,
      );
    }

    const rootValidatorName = functionName(rootTypeIdx);
    const rootValidator = `\nreturn ${rootValidatorName}`;

    return [...refs].map((idx) => this.codes.get(idx))
      .join("\n") + rootValidator;
  }
}

class CodeGenerator {
  lines: string[] = [];

  generateEnumValidator(typeNode: TypeNode) {
    const comparisons = [];

    if (
      ([
        Type.BOOLEAN,
        Type.NUMBER,
        Type.INTEGER,
        Type.STRING,
      ] as TypeNode["type"][])
        .includes(typeNode.type)
    ) {
      // shallow comparison
      comparisons.push(
        ...typeNode.enum!.map((val) => `value !== ${val}`),
      );
    } else {
      // deep comparison
      comparisons.push(
        ...typeNode.enum!.map((val) => `!context.deepEqual(value, ${val})`),
      );
    }

    this.validation(
      comparisons.join(" && "),
      '"value did not match to any of the enum values"',
    );
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

  generateStringValidator(typeNode: StringNode) {
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
    if (typeNode.pattern != null) {
      this.line("else {");
      this.validation(
        `!new RegExp("${typeNode.pattern}").test(value)`,
        `"string does not match to the pattern /${typeNode.pattern}/"`,
      );
      this.line("}");
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

  generateOptionalValidator(typeNode: OptionalNode) {
    this.line(`if (value != null) {`);
    this.line(
      `${functionName(typeNode.item)}(value, path, errors, context)`,
    );
    this.line("}");
  }

  generateArrayValidator(typeNode: ArrayNode) {
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
    const itemValidator = functionName(itemType);

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

  generateObjectValidator(typeNode: ObjectNode) {
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
      const validator = functionName(typeIdx);
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

  generateUnionValidator(typeNode: UnionNode) {
    this.line("let errs;");
    for (const variantIdx of typeNode.anyOf) {
      this.line(`errs = []`);
      const validator = functionName(variantIdx);
      this.line(`${validator}(value, path, errs, context)`);
      this.line("if (errs.length === 0) { return }");
    }
    // TODO display variant errors
    this.line(
      'errors.push([path, "Value does not match to any variant of the union type"])',
    );
    return typeNode.anyOf;
  }

  generateEitherValidator(typeNode: EitherNode) {
    this.line("let matchCount = 0;");
    this.line("let errs;");

    for (const variantIdx of typeNode.oneOf) {
      this.line(`errs = []`);
      const validator = functionName(variantIdx);
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

  reset(): string[] {
    const lines = this.lines;
    this.lines = [];
    return lines;
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

  line(l: string) {
    this.lines.push(l);
  }
}
