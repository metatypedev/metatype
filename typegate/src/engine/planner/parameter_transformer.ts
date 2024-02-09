// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  ParameterTransformNode,
  ParameterTransformParentNode,
} from "../../typegraph/types.ts";

export type TransformParamsInput = {
  args: Record<string, any>;
  context: Record<string, any>;
  // secrets: Record<string, any>;
  parent: Record<string, any>;
};

export function defaultParameterTransformer(input: TransformParamsInput) {
  return input.args;
}

export type TransformParams = {
  (input: TransformParamsInput): Record<string, any>;
};

export function compileParameterTransformer(
  transformerTreeRootFields: Record<string, ParameterTransformNode>,
  parentProps: Record<string, number>,
): TransformParams {
  const rootNode: ParameterTransformParentNode = {
    type: "object",
    fields: transformerTreeRootFields,
  };
  const ctx = new TransformerCompilationContext(parentProps);
  const fnBody = ctx.compile(rootNode);
  return new Function("input", fnBody) as TransformParams;
}

class TransformerCompilationContext {
  #parentProps: Record<string, number>;
  #path: string[] = [];
  #latestVarIndex = 0;
  #collector: string[] = [];

  constructor(parentProps: Record<string, number>) {
    this.#parentProps = parentProps;
  }

  #reset() {
    this.#collector = [
      // TODO secrets
      "const { args, context, parent } = input;\n",
    ];
  }

  compile(rootNode: ParameterTransformParentNode) {
    this.#reset();
    const varName = this.#compileNode(rootNode);
    this.#collector.push(`return ${varName};`);
    return this.#collector.join("\n");
  }

  #compileNode(node: ParameterTransformNode) {
    if ("type" in node) {
      switch (node.type) {
        case "object":
          return this.#compileObject(node.fields);
        case "array":
          return this.#compileArray(node.items);
        default:
          // unreachable
          throw new Error(
            `Unknown type: ${(node as any).type} at ${this.#path}`,
          );
      }
    } else {
      switch (node.source) {
        case "arg":
          return this.#compileArgInjection(node.name);
        case "context":
          return this.#compileContextInjection(node.key);
        // case "secret":
        //   return this.#compileSecretsInjection(node);
        case "parent":
          return this.#compileParentInjection(node.type_idx);
        default:
          throw new Error(`Unknown source: ${node.source} at ${this.#path}`);
      }
    }
  }

  #compileObject(fields: Record<string, ParameterTransformNode>): string {
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = {};`);

    for (const [key, node] of Object.entries(fields)) {
      const path = this.#path;
      path.push(key);
      const propVarName = this.#compileNode(node);
      path.pop();
      this.#collector.push(`${varName}["${key}"] = ${propVarName};`);
    }

    return varName;
  }

  #compileArray(items: ParameterTransformNode[]) {
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = [];`);

    for (let i = 0; i < items.length; i++) {
      const path = this.#path;
      path.push(i.toString());
      const propVarName = this.#compileNode(items[i]);
      path.pop();
      this.#collector.push(`${varName}.push(${propVarName});`);
    }

    return varName;
  }

  #compileArgInjection(name: string) {
    // TODO type validation ?
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = args["${name}"];`);
    return varName;
  }

  #compileContextInjection(key: string) {
    // TODO type validation ?
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = context["${key}"];`);
    return varName;
  }

  // #compileSecretsInjection(key: string) {
  //   // TODO type validation ?
  //   const varName = this.#createVarName();
  //   this.#collector.push(`const ${varName} = secrets["${key}"];`);
  //   return varName;
  // }

  #compileParentInjection(typeIdx: number) {
    // TODO type validation ?
    // TODO what if the value is lazy (a function?)
    const key = Object.entries(this.#parentProps)
      .find(([_key, idx]) => idx === typeIdx)!;
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = parent["${key}"];`);
    return varName;
  }

  #createVarName() {
    return `var${++this.#latestVarIndex}`;
  }
}
