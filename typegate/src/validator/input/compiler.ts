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

  return [...generateValidatorCode(graphRoot)].join("\n");
}

const INDENT = "  ";

function* generateValidatorCode(root: Node): Generator<string, void> {
  yield "function validate(value, context) {";
  yield `${INDENT}const { formatValidators } = context;`;
  yield `${INDENT}const errors = [];`;
  yield* new CodeGenerator().generateFromNode(root, "value", INDENT, false);
  yield "}";
}

class CodeGenerator {
  *generateFromNode(
    node: Node,
    prevValueRef: string,
    indent: string,
    elseClause: boolean,
  ): Generator<string, void> {
    const valueRef = prevValueRef + node.pathSuffix;
    switch (node.kind) {
      case "validation": {
        const ifPrefix = elseClause ? "else " : "";
        yield `${indent}${ifPrefix}if (!(${node.condition(valueRef)})) {`;
        yield `${indent + INDENT}errors.push(${node.error(valueRef)}) }`;
        switch (node.next.length) {
          case 0:
            break;
          case 1:
            yield* this.generateFromNode(
              node.next[0],
              valueRef,
              indent,
              true,
            );
            break;
          default:
            yield `${indent}else {`;
            for (const nextNode of node.next) {
              yield* this.generateFromNode(
                nextNode,
                valueRef,
                indent + INDENT,
                false,
              );
            }
            yield `${indent}}`;
        }
        break;
      }

      case "branch": {
        const ifPrefix = elseClause ? "else " : "";
        yield `${indent}${ifPrefix}if (${node.condition(valueRef)}) {`;
        for (const nod of node.yes) {
          yield* this.generateFromNode(nod, valueRef, indent + INDENT, false);
        }
        yield `${indent}} else {`;
        for (const nod of node.no) {
          yield* this.generateFromNode(nod, valueRef, indent + INDENT, false);
        }
        yield "}";
        break;
      }

      case "loop": {
        this.generateFromLoopNode(node, prevValueRef, indent, elseClause);
        break;
      }
    }
  }

  *generateFromLoopNode(
    node: LoopNode,
    prevValueRef: string,
    indent: string,
    elseClause: boolean,
  ): Generator<string, void> {
    if (elseClause) {
      yield `${indent}else {`;
      yield* this.generateFromLoopNode(
        node,
        prevValueRef,
        indent + INDENT,
        false,
      );
      yield "}";
    } else {
      const valueRef = prevValueRef + node.pathSuffix;
      const iterVar = node.iterationVariable;
      const iterCount = node.iterationCount(valueRef);
      yield `${indent}for (let ${iterVar} = 0; ${iterVar} < ${iterCount}; ++${iterVar}) {`;
      yield* this.generateFromNode(
        node.nextNodes,
        valueRef,
        indent + INDENT,
        false,
      );
      yield "}";
    }
  }
}
