// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeNode } from "../../type_node.ts";
import { TypeGraph } from "../../typegraph.ts";
import { createValidationGraph, LoopNode, Node } from "./validation_graph.ts";

export interface ValidationError {
  location: string; // virtual path, in the value/object
  value: unknown;
  typeNode: TypeNode;
  constraint: string;
}

export type ValidatorResult = { success: true } | {
  errors: Array<ValidationError>;
};

export interface InputValidator {
  (value: unknown): ValidatorResult;
}

export function compile(
  tg: TypeGraph,
  inputTypeIdx: number,
): string {
  const graphRoot = createValidationGraph(tg, inputTypeIdx);

  return [...generateValidatorCode(graphRoot)].join("");
}

function* generateValidatorCode(root: Node): Generator<string, void> {
  yield "function validate(value, context) {";
  yield `const { formatValidators } = context;`;
  yield `const errors = [];`;
  yield* new CodeGenerator().generateFromNode(root, "value", false);
  yield `return errors`;
  yield "}";
}

class CodeGenerator {
  *generateFromNode(
    node: Node,
    prevValueRef: string,
    elseClause: boolean,
  ): Generator<string, void> {
    const valueRef = prevValueRef + node.pathSuffix;
    switch (node.kind) {
      case "validation": {
        const ifPrefix = elseClause ? "else " : "";
        yield `${ifPrefix}if (!(${node.condition(valueRef)})) {`;
        yield `errors.push(${node.error(valueRef)}) }`;
        switch (node.next.length) {
          case 0:
            break;
          case 1:
            yield* this.generateFromNode(
              node.next[0],
              valueRef,
              true,
            );
            break;
          default:
            yield `else {`;
            for (const nextNode of node.next) {
              yield* this.generateFromNode(
                nextNode,
                valueRef,
                false,
              );
            }
            yield `}`;
        }
        break;
      }

      case "branch": {
        const ifPrefix = elseClause ? "else " : "";
        yield `${ifPrefix}if (${node.condition(valueRef)}) {`;
        for (const nod of node.yes) {
          yield* this.generateFromNode(nod, valueRef, false);
        }
        yield `} else {`;
        for (const nod of node.no) {
          yield* this.generateFromNode(nod, valueRef, false);
        }
        yield "}";
        break;
      }

      case "loop": {
        this.generateFromLoopNode(node, prevValueRef, elseClause);
        break;
      }
    }
  }

  *generateFromLoopNode(
    node: LoopNode,
    prevValueRef: string,
    elseClause: boolean,
  ): Generator<string, void> {
    if (elseClause) {
      yield `else {`;
      yield* this.generateFromLoopNode(
        node,
        prevValueRef,
        false,
      );
      yield "}";
    } else {
      const valueRef = prevValueRef + node.pathSuffix;
      const iterVar = node.iterationVariable;
      const iterCount = node.iterationCount(valueRef);
      yield `for (let ${iterVar} = 0; ${iterVar} < ${iterCount}; ++${iterVar}) {`;
      yield* this.generateFromNode(
        node.nextNodes,
        valueRef,
        false,
      );
      yield "}";
    }
  }
}
