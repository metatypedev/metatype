import type * as ast from "graphql_ast";
import { Kind } from "graphql";
import { Maybe } from "./utils.ts";

export type FragmentDefs = Record<string, ast.FragmentDefinitionNode>;

export const findOperation = (
  document: ast.DocumentNode,
  operationName: Maybe<string>,
  variables: Record<string, unknown>,
): [Maybe<ast.OperationDefinitionNode>, FragmentDefs] => {
  let def = null;
  let lastDef = null;
  const fragments: FragmentDefs = {};
  for (const definition of document.definitions) {
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        lastDef = definition;
        if (
          definition.name?.value === operationName &&
          (definition.operation == "query" ||
            definition.operation == "mutation")
        ) {
          if (def !== null) {
            throw Error(
              `multiple definition of same operation ${operationName}`,
            );
          }

          def = definition;
        }
        break;
      case Kind.FRAGMENT_DEFINITION:
        fragments[definition.name.value] = definition;
        break;
      default:
    }
  }
  if (!operationName && lastDef) {
    def = lastDef;
  }
  for (const varDef of def?.variableDefinitions ?? []) {
    const varName = varDef.variable.name.value;
    if (variables[varName] === undefined) {
      throw Error(`missing variable ${varName} value`);
    }
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
