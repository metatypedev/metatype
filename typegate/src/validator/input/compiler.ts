// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeNode } from "../../type_node.ts";
import { TypeGraph } from "../../typegraph.ts";
import {
  createValidationGraph,
  LoopNode,
  Node,
  ValueShift,
} from "./validation_graph.ts";

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

function* generateValidatorCode(root: Node): Generator<string, void> {
  yield "function validate(value, context) {";
  yield `const { formatValidators } = context;`;
  yield `const errors = [];`;
  yield* new CodeGenerator().generateFromNode(root, "v", "value", false);
  yield `return errors`;
  yield "}";
}

class CodeGenerator {
  *generateFromNode(
    node: Node,
    prevPath: string,
    prevValueRef: string,
    elseClause: boolean,
  ): Generator<string, void> {
    const [path, valueRef] = shifted([prevPath, prevValueRef], node.shift);
    switch (node.kind) {
      case "validation": {
        const { collectErrorsIn: errVar = "errors" } = node;
        let closeBrackets = 0;
        let ifPrefix = "";
        if (elseClause) {
          if (node.prepare != null) {
            yield `else { ${node.prepare}`;
            ++closeBrackets;
          } else {
            ifPrefix = "else ";
          }
        } else if (node.prepare != null) {
          yield node.prepare;
        }
        yield `${ifPrefix}if (!(${node.condition(valueRef)})) {`;
        yield `${errVar}.push([\`${path}\`, ${node.error(valueRef)}]) }`;
        switch (node.next.length) {
          case 0:
            break;
          case 1:
            yield* this.generateFromNode(
              node.next[0],
              path,
              valueRef,
              true,
            );
            break;
          default:
            yield "else {";
            for (const nextNode of node.next) {
              yield* this.generateFromNode(
                nextNode,
                path,
                valueRef,
                false,
              );
            }
            yield "}";
        }
        while (closeBrackets-- > 0) {
          yield "}";
        }
        break;
      }

      case "branch": {
        const ifPrefix = elseClause ? "else " : "";
        yield `${ifPrefix}if (${node.condition(valueRef)}) {`;
        // TODO empty branches...
        for (const nod of node.yes) {
          yield* this.generateFromNode(nod, path, valueRef, false);
        }
        yield `} else {`;
        for (const nod of node.no) {
          yield* this.generateFromNode(nod, path, valueRef, false);
        }
        yield "}";
        break;
      }

      case "loop":
        yield* this.generateFromLoopNode(node, path, prevValueRef, elseClause);
        break;
    }
  }

  *generateFromLoopNode(
    node: LoopNode,
    prevPath: string,
    prevValueRef: string,
    elseClause: boolean,
  ): Generator<string, void> {
    if (elseClause) {
      yield `else {`;
      yield* this.generateFromLoopNode(
        node,
        prevPath,
        prevValueRef,
        false,
      );
      yield "}";
    } else {
      const [path, valueRef] = shifted([prevPath, prevValueRef], node.shift);
      const iterVar = node.iterationVariable;
      const iterCount = node.iterationCount(valueRef);
      yield `for (let ${iterVar} = 0; ${iterVar} < ${iterCount}; ++${iterVar}) {`;
      for (const nextNode of node.nodes) {
        yield* this.generateFromNode(
          nextNode,
          path,
          valueRef,
          false,
        );
      }
      yield "}";
    }
  }
}

function shifted(
  prev: [path: string, ref: string],
  shift: ValueShift | undefined,
): [path: string, ref: string] {
  if (shift == null) {
    return prev;
  }
  const [prevPath, prevRef] = prev;
  return [prevPath + shift.path, prevRef + shift.ref];
}
