// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { None, Option, Some } from "monads";
import { forceOptionToValue } from "./utils.ts";

export type FragmentDefs = Record<string, ast.FragmentDefinitionNode>;

export const findOperation = (
  document: ast.DocumentNode,
  operationName: Option<string>,
): [Option<ast.OperationDefinitionNode>, FragmentDefs] => {
  let def: Option<ast.OperationDefinitionNode> = None;
  let lastDef: Option<ast.OperationDefinitionNode> = None;
  const fragments: FragmentDefs = {};
  for (const definition of document.definitions) {
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        lastDef = Some(definition);
        if (
          definition.name?.value === forceOptionToValue(operationName) &&
          (definition.operation == "query" ||
            definition.operation == "mutation")
        ) {
          if (def.isSome()) {
            throw Error(
              `multiple definition of same operation ${operationName}`,
            );
          }

          def = Some(definition);
        }
        break;
      case Kind.FRAGMENT_DEFINITION:
        fragments[definition.name.value] = definition;
        break;
      default:
    }
  }
  if (operationName.isNone() && lastDef.isSome()) {
    def = lastDef;
  }

  return [def, fragments];
};

export const resolveSelection = (
  nodes: ast.SelectionSetNode,
  fragments: FragmentDefs,
): ast.FieldNode[] => {
  return (nodes.selections ?? []).flatMap((node) => {
    if (node.kind === Kind.FRAGMENT_SPREAD) {
      // fetch fragment
      const fragment = fragments[node.name?.value];
      if (!fragment) {
        throw Error("unknown fragment");
      }
      return resolveSelection(
        fragments[node.name?.value].selectionSet,
        fragments,
      );
    }
    if (node.kind === Kind.INLINE_FRAGMENT) {
      return resolveSelection(node.selectionSet, fragments);
    }
    if (node.kind === Kind.FIELD) {
      return [node];
    }
    throw Error();
  });
};
