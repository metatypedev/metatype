// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  ArrayNode,
  BooleanNode,
  FileNode,
  FloatNode,
  IntegerNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  Type,
  TypeNode,
  UnionNode,
} from "../type_node.ts";
import { EitherNode } from "../types/typegraph.ts";

export class CodeGenerator {
  lines: string[] = [];

  generateEnumValidator(typeNode: TypeNode) {
    const comparisons = [];

    if (
      ([
        Type.BOOLEAN,
        Type.FLOAT,
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

  generateNumberValidator(typeNode: FloatNode | IntegerNode) {
    this.validation(
      'typeof value !== "number"',
      "`expected number, got ${typeof value}`",
      ["return"],
    );

    if (typeNode.type === "integer") {
      this.validation(
        `parseInt(value) !== value`,
        `\`expected an integer, got \${value}\``,
        ["return"],
      );
    }

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

  generateFileValidator(typeNode: FileNode) {
    this.validation("!(value instanceof File)", '"expected a file"');
    const constraints = [
      ["minSize", "<", "minimum size"],
      ["maxSize", ">", "maximum size"],
    ] as const;
    for (const c of constraints) {
      const [prop, comp, name] = c;
      const constraint = typeNode[prop];
      if (constraint != null) {
        this.line("else");
        this.validation(
          `value.size ${comp} ${constraint}`,
          `\`expected ${name}: ${constraint}, got \${value.size}\``,
        );
      }
    }

    const mimeTypes = typeNode.mimeTypes;
    if (mimeTypes != null) {
      this.line("else");
      const arrayExpr = JSON.stringify(mimeTypes);
      this.validation(
        `!${arrayExpr}.includes(value.type)`,
        `\`type '\${value.type}' not allowed\``,
      );
    }
  }

  generateOptionalValidator(
    _typeNode: OptionalNode,
    itemValidatorName: string,
  ) {
    this.line(`if (value != null) {`);
    this.line(
      `${itemValidatorName}(value, path, errors, context)`,
    );
    this.line("}");
  }

  generateArrayValidator(
    typeNode: ArrayNode,
    itemValidatorName: string,
  ) {
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

    this.line("else {");
    this.line("for (let i = 0; i < value.length; ++i) {");
    this.line("const item = value[i]");
    this.line(
      `${itemValidatorName}(value[i], path + \`[\${i}]\`, errors, context)`,
    );
    this.line("}");
    this.line("}");

    return [itemType];
  }

  generateObjectValidator(
    typeNode: ObjectNode,
    propValidatorNames: Record<string, string>,
  ) {
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

    for (const [name, validator] of Object.entries(propValidatorNames)) {
      this.line(`keys.delete("${name}")`);
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

  generateUnionValidator(
    typeNode: UnionNode,
    variantValidatorNames: string[],
  ) {
    this.line("let errs;");

    const variantCount = typeNode.anyOf.length;
    if (variantValidatorNames.length !== variantCount) {
      throw new Error(
        "The length of variantValidatorNames does not match to the variant count",
      );
    }
    for (let i = 0; i < variantCount; ++i) {
      this.line(`errs = []`);
      const validator = variantValidatorNames[i];
      this.line(`${validator}(value, path, errs, context)`);
      this.line("if (errs.length === 0) { return }");
    }

    // TODO display variant errors
    this.line(
      'errors.push([path, "Value does not match to any variant of the union type"])',
    );
  }

  generateEitherValidator(
    typeNode: EitherNode,
    variantValidatorNames: string[],
  ) {
    this.line("let matchCount = 0;");
    this.line("let errs;");

    const variantCount = typeNode.oneOf.length;
    if (variantValidatorNames.length !== variantCount) {
      throw new Error(
        "The length of variantValidatorNames does not match to the variant count",
      );
    }
    for (let i = 0; i < variantCount; ++i) {
      this.line(`errs = []`);
      const validator = variantValidatorNames[i];
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
