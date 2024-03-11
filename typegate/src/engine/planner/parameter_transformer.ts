// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryFn, QueryFunction } from "../../libs/jsonpath.ts";
import { TypeGraph } from "../../typegraph/mod.ts";
import { Type } from "../../typegraph/type_node.ts";
import { ParameterTransformNode } from "../../typegraph/types.ts";
import { ValidationContext, validationContext } from "../typecheck/common.ts";
import { generateListValidator } from "../typecheck/inline_validators/list.ts";
import { generateNumberValidator } from "../typecheck/inline_validators/number.ts";
import {
  generateObjectValidator,
  getKeys,
} from "../typecheck/inline_validators/object.ts";
import { generateStringValidator } from "../typecheck/inline_validators/string.ts";
import { InputValidationCompiler } from "../typecheck/input.ts";

export type TransformParamsInput = {
  args: Record<string, any>;
  parent: Record<string, any>;
  context: Record<string, any>;
};

export function defaultParameterTransformer(input: TransformParamsInput) {
  return input.args;
}

export type TransformParams = {
  (input: TransformParamsInput): Record<string, any>;
};

type CompiledTransformerInput = {
  args: Record<string, any>;
  parent: Record<string, any>;
  getContext: ContextQuery;
};

type CompiledTransformer = {
  (
    input: CompiledTransformerInput,
    contxt: ValidationContext,
  ): Record<string, any>;
};

export function compileParameterTransformer(
  typegraph: TypeGraph,
  parentProps: Record<string, number>,
  transformerTreeRoot: ParameterTransformNode,
): TransformParams {
  const ctx = new TransformerCompilationContext(typegraph, parentProps);
  const { fnBody, deps } = ctx.compile(transformerTreeRoot);
  const fn = new Function("input", "context", fnBody) as CompiledTransformer;
  return ({ args, context, parent }) => {
    const getContext = compileContextQueries(deps.contexts)(context);
    const res = fn({ args, getContext, parent }, validationContext);
    return res;
  };
}

type Dependencies = {
  contexts: {
    strictMode: Set<string>;
    nonStrictMode: Set<string>;
  };
};

type ContextQuery = (path: string, options: { strict: boolean }) => unknown;

function compileContextQueries(contexts: Dependencies["contexts"]) {
  return (context: Record<string, any>): ContextQuery => {
    const strictMode = new Map<string, QueryFn>();
    const nonStrictMode = new Map<string, QueryFn>();

    for (const path of contexts.strictMode) {
      strictMode.set(
        path,
        QueryFunction.create(path, { strict: true }).asFunction(),
      );
    }

    for (const path of contexts.nonStrictMode) {
      nonStrictMode.set(
        path,
        QueryFunction.create(path, { strict: false }).asFunction(),
      );
    }

    return (path, options) => {
      const fn = options.strict
        ? strictMode.get(path)
        : nonStrictMode.get(path);
      if (!fn) {
        throw new Error(`Unknown context query: ${path}`);
      }
      return fn(context);
    };
  };
}

class TransformerCompilationContext {
  #tg: TypeGraph;
  #parentProps: Record<string, number>;
  #path: string[] = [];
  #latestVarIndex = 0;
  #collector: string[] = [];
  #dependencies: Dependencies = {
    contexts: {
      strictMode: new Set(),
      nonStrictMode: new Set(),
    },
  };
  #inputValidatorCompiler: InputValidationCompiler;
  #typesWithCustomValidator: Set<number> = new Set();

  constructor(typegraph: TypeGraph, parentProps: Record<string, number>) {
    this.#tg = typegraph;
    this.#parentProps = parentProps;
    this.#inputValidatorCompiler = new InputValidationCompiler(
      typegraph,
      (idx) => `validate_${idx}`,
    );
  }

  #reset() {
    this.#collector = [
      "const { args, parent, getContext } = input;\n",
    ];
    this.#dependencies = {
      contexts: {
        strictMode: new Set(),
        nonStrictMode: new Set(),
      },
    };
  }

  compile(rootNode: ParameterTransformNode) {
    this.#reset();
    const varName = this.#compileNode(rootNode);
    this.#collector.push(`return ${varName};`);
    const customValidators = [...this.#typesWithCustomValidator]
      .map((idx) => this.#inputValidatorCompiler.codes.get(idx))
      .join("\n");
    const res = {
      fnBody: customValidators + this.#collector.join("\n"),
      deps: this.#dependencies,
    };

    this.#reset();

    return res;
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
    while (typeNode.type === Type.OPTIONAL) {
      typeNode = this.#tg.type(typeNode.item);
      optional = true;
    }

    const opts = `{ strict: ${!optional} }`;
    this.#collector.push(
      `const ${varName} = getContext(${JSON.stringify(key)}, ${opts});`,
    );
    const mode = optional ? "nonStrictMode" : "strictMode";
    this.#dependencies.contexts[mode].add(key);

    const path = this.#path.join(".");

    this.#collector.push(`if (${varName} != null) {`);

    const types = this.#inputValidatorCompiler.generateValidators(typeIdx);
    for (const idx of types) {
      this.#typesWithCustomValidator.add(idx);
    }
    const errorVar = this.#createVarName();
    this.#collector.push(`const ${errorVar} = [];`);
    const args = [varName, JSON.stringify(path), errorVar, "context"];
    this.#collector.push(`  validate_${typeIdx}(${args.join(", ")});`);
    this.#collector.push(`  if (${errorVar}.length > 0) {`);
    const errorStrVar = this.#createVarName();
    const errMap = `([path, msg]) => \`  - at \${path}: \${msg}\``;
    this.#collector.push(
      `    const ${errorStrVar} = ${errorVar}.map(${errMap}).join("\\n");`,
    );
    this.#collector.push(
      `    throw new Error(\`Context validation failed:\\n\${${errorStrVar}}\`);`,
    );
    this.#collector.push(`  }`);

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
      default:
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
    return `_var${++this.#latestVarIndex}`;
  }
}
