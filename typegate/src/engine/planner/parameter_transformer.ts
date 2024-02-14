// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph } from "../../typegraph/mod.ts";
import { Type } from "../../typegraph/type_node.ts";
import { ParameterTransformNode } from "../../typegraph/types.ts";
import { generateBooleanValidator } from "../typecheck/inline_validators/boolean.ts";
import { generateListValidator } from "../typecheck/inline_validators/list.ts";
import { generateNumberValidator } from "../typecheck/inline_validators/number.ts";
import {
  generateObjectValidator,
  getKeys,
} from "../typecheck/inline_validators/object.ts";
import { generateStringValidator } from "../typecheck/inline_validators/string.ts";

export type TransformParamsInput = {
  args: Record<string, any>;
  context: Record<string, any>;
  parent: Record<string, any>;
};

export function defaultParameterTransformer(input: TransformParamsInput) {
  return input.args;
}

export type TransformParams = {
  (input: TransformParamsInput): Record<string, any>;
};

export function compileParameterTransformer(
  typegraph: TypeGraph,
  parentProps: Record<string, number>,
  transformerTreeRoot: ParameterTransformNode,
): TransformParams {
  const ctx = new TransformerCompilationContext(typegraph, parentProps);
  const fnBody = ctx.compile(transformerTreeRoot);
  const fn = new Function("input", fnBody) as TransformParams;
  return (input) => {
    const res = fn(input);
    return res;
  };
}

class TransformerCompilationContext {
  #tg: TypeGraph;
  #parentProps: Record<string, number>;
  #path: string[] = [];
  #latestVarIndex = 0;
  #collector: string[] = [];

  constructor(typegraph: TypeGraph, parentProps: Record<string, number>) {
    this.#tg = typegraph;
    this.#parentProps = parentProps;
  }

  #reset() {
    this.#collector = [
      "const { args, context, parent } = input;\n",
    ];
  }

  compile(rootNode: ParameterTransformNode) {
    this.#reset();
    const varName = this.#compileNode(rootNode);
    this.#collector.push(`return ${varName};`);
    return this.#collector.join("\n");
  }

  #compileNode(node: ParameterTransformNode) {
    const { typeIdx, data: nodeData } = node;
    if ("type" in nodeData) {
      switch (nodeData.type) {
        case "object":
          return this.#compileObject(typeIdx, nodeData.fields);
        case "array":
          return this.#compileArray(typeIdx, nodeData.items);
        default:
          // unreachable
          throw new Error(
            `Unknown type: ${(nodeData as any).type} at ${this.#path}`,
          );
      }
    } else {
      switch (nodeData.source) {
        case "arg":
          return this.#compileArgInjection(typeIdx, nodeData.name);
        case "context":
          return this.#compileContextInjection(typeIdx, nodeData.key);
        case "secret":
          return this.#compileSecretsInjection(typeIdx, nodeData.key);
        case "parent":
          return this.#compileParentInjection(typeIdx, nodeData.parentIdx);
        default:
          throw new Error(
            `Unknown source: ${nodeData.source} at ${this.#path}`,
          );
      }
    }
  }

  #compileObject(
    typeIdx: number,
    fields: Record<string, ParameterTransformNode>,
  ): string {
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = {};`);

    for (const [key, node] of Object.entries(fields)) {
      const path = this.#path;
      path.push(key);
      const propVarName = this.#compileNode(node);
      path.pop();
      this.#collector.push(
        `${varName}[${JSON.stringify(key)}] = ${propVarName};`,
      );
    }

    const typeNode = this.#tg.type(typeIdx, Type.OBJECT);

    this.#collector.push(
      ...generateObjectValidator(
        typeNode,
        varName,
        this.#path.join("."),
        getKeys(typeNode, (idx) => this.#tg.type(idx)),
      ),
    );

    return varName;
  }

  #compileArray(typeIdx: number, items: ParameterTransformNode[]) {
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = [];`);

    for (let i = 0; i < items.length; i++) {
      const path = this.#path;
      path.push(i.toString());
      const propVarName = this.#compileNode(items[i]);
      path.pop();
      this.#collector.push(`${varName}.push(${propVarName});`);
    }

    const typeNode = this.#tg.type(typeIdx, Type.LIST);

    this.#collector.push(
      ...generateListValidator(typeNode, varName, this.#path.join(".")),
    );

    return varName;
  }

  #compileArgInjection(_typeIdx: number, name: string) {
    // No validation is needed since the value is already validated in the planner
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = args[${JSON.stringify(name)}];`);
    return varName;
  }

  #compileContextInjection(typeIdx: number, key: string) {
    const varName = this.#createVarName();
    let typeNode = this.#tg.type(typeIdx);
    let optional = false;
    if (typeNode.type === Type.OPTIONAL) {
      typeNode = this.#tg.type(typeNode.item);
      optional = true;
    }
    this.#collector.push(`const ${varName} = context[${JSON.stringify(key)}];`);

    const path = this.#path.join(".");

    this.#collector.push(`if (${varName} != null) {`);

    switch (typeNode.type) {
      case Type.OPTIONAL:
        throw new Error(`At "${path}": nested optional not supported`);
      case Type.INTEGER: {
        const parsedVar = this.#createVarName();
        this.#collector.push(
          `const ${parsedVar} = parseInt(${varName}, 10);`,
          ...generateNumberValidator(typeNode, parsedVar, path),
        );
        break;
      }
      case Type.FLOAT: {
        const parsedVar = this.#createVarName();
        this.#collector.push(
          `const ${parsedVar} = parseFloat(${varName});`,
          ...generateNumberValidator(typeNode, parsedVar, path),
        );
        break;
      }
      case Type.STRING:
        this.#collector.push(
          ...generateStringValidator(typeNode, varName, path),
        );
        break;
      case Type.BOOLEAN: {
        const parsedVar = this.#createVarName();

        this.#collector.push(
          `const ${varName} = Boolean(${varName});`,
          ...generateBooleanValidator(typeNode, parsedVar, path),
        );
        break;
      }

      default:
        throw new Error(
          `At "${path}": Unsupported type "${typeNode.type}" for context injection`,
        );
    }

    this.#collector.push("}");
    if (!optional) {
      const keyStr = JSON.stringify(key);
      this.#collector.push(
        `else {`,
        `  throw new Error(\`At "${path}": Context value is missing for "${keyStr}"\`);`,
        `}`,
      );
    }

    return varName;
  }

  #compileSecretsInjection(typeIdx: number, key: string) {
    const typeNode = this.#tg.type(typeIdx);
    const secret = this.#tg.parseSecret(typeNode, key);
    // TODO type validation ? -- only additional constraints
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = ${JSON.stringify(secret)};`);

    const path = this.#path.join(".");

    switch (typeNode.type) {
      case Type.STRING:
        this.#collector.push(
          ...generateStringValidator(typeNode, varName, path),
        );
        break;
      case Type.INTEGER:
      case Type.FLOAT:
        this.#collector.push(
          ...generateNumberValidator(typeNode, varName, path),
        );
        break;
      default:
        // TODO optional??
        throw new Error(
          `At "${path}": Unsupported type "${typeNode.type}" for secret injection`,
        );
    }

    return varName;
  }

  #compileParentInjection(_typeIdx: number, parentIdx: number) {
    // VALIDATION
    // - the source is validated in the arg computation step;
    // - type inheritance is checked AOT with the typegraph

    // TODO what if the value is lazy (a function?)

    const [key] = Object.entries(this.#parentProps)
      .find(([_key, idx]) => idx === parentIdx)!;
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = parent[${JSON.stringify(key)}];`);
    return varName;
  }

  #createVarName() {
    return `var${++this.#latestVarIndex}`;
  }
}
