import type * as ast from "https://cdn.skypack.dev/graphql@16.2.0/language/ast?dts";
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  parse,
  GraphQLArgs,
  Kind,
} from "https://cdn.skypack.dev/graphql@16.2.0?dts";
import { Maybe } from "./utils.ts";

export type FragmentDefs = Record<string, ast.FragmentDefinitionNode>;

export const findOperation = (
  document: ast.DocumentNode,
  operationName: Maybe<string>
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
  return [def, fragments];
};

export const resolveSelection = (
  nodes: ast.SelectionSetNode,
  fragments: FragmentDefs
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
        fragments
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
