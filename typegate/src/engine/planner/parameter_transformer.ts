// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph } from "../../typegraph/mod.ts";
import { ParameterTransformNode } from "../../typegraph/types.ts";

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
    _typeIdx: number, // TODO validation
    fields: Record<string, ParameterTransformNode>,
  ): string {
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

  #compileArray(_typeIdx: number, items: ParameterTransformNode[]) {
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

  #compileArgInjection(_typeIdx: number, name: string) {
    // TODO type validation ?
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = args["${name}"];`);
    return varName;
  }

  #compileContextInjection(_typeIdx: number, key: string) {
    // TODO type validation ?
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = context["${key}"];`);
    return varName;
  }

  // return () => this.tg.parseSecret(typ, secretName);
  #compileSecretsInjection(typeIdx: number, key: string) {
    const secret = this.#tg.parseSecret(this.#tg.type(typeIdx), key);
    // TODO type validation ? -- only additional constraints
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = ${JSON.stringify(secret)};`);
    return varName;
  }

  #compileParentInjection(_typeIdx: number, parentIdx: number) {
    // TODO type validation ?
    // TODO what if the value is lazy (a function?)
    const [key] = Object.entries(this.#parentProps)
      .find(([_key, idx]) => idx === parentIdx)!;
    const varName = this.#createVarName();
    this.#collector.push(`const ${varName} = parent["${key}"];`);
    return varName;
  }

  #createVarName() {
    return `var${++this.#latestVarIndex}`;
  }
}
