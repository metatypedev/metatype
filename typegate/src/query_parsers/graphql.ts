// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS } from "../typegraph.ts";
import { ObjectNode } from "../type_node.ts";

type PropertiesTable = Record<string, number>;

function addNewObjectNode(typegraph: TypeGraphDS, node: ObjectNode): number {
  const { types } = typegraph;
  types.push(node);
  return types.length - 1;
}

/**
 * Splits a TypeGraph into GraphQL `queries` and `mutations`
 */
function splitGraphQLOperations(
  typegraph: TypeGraphDS,
  node: ObjectNode,
): [PropertiesTable, PropertiesTable] {
  const queryProperties: PropertiesTable = {};
  const mutationProperties: PropertiesTable = {};

  for (const [propertyName, typeIndex] of Object.entries(node.properties)) {
    const childNode = typegraph.types[typeIndex];

    // if the leaf node of a path its a function
    // with a materializer that is serial
    // classify the root node of this path as a `mutation`
    // otherwise as a `query`
    switch (childNode.type) {
      case "object": {
        const [childQueryProperties, childMutationProperties] =
          splitGraphQLOperations(
            typegraph,
            childNode,
          );

        if (Object.keys(childQueryProperties).length === 0) {
          queryProperties[propertyName] = typeIndex;
          childNode.config = Object.assign(childNode.config ?? {}, {
            __namespace: true,
          });
        } else if (Object.keys(childMutationProperties).length === 0) {
          mutationProperties[propertyName] = typeIndex;
          childNode.config = Object.assign(childNode ?? {}, {
            __namespace: true,
          });
        } else {
          queryProperties[propertyName] = addNewObjectNode(typegraph, {
            ...node,
            title: `${node.title}_q`,
            properties: childQueryProperties,
            config: { ...(node.config ?? {}), __namespace: true },
          });
          mutationProperties[propertyName] = addNewObjectNode(typegraph, {
            ...node,
            title: `${node.title}_m`,
            properties: childMutationProperties,
            config: { ...(node.config ?? {}), __namespace: true },
          });
        }
        break;
      }

      case "function": {
        const childMaterializer =
          typegraph.materializers[childNode.materializer];

        if (!childMaterializer.data.serial) {
          queryProperties[propertyName] = typeIndex;
          // TODO additional checks
        } else {
          mutationProperties[propertyName] = typeIndex;
          // TODO additional checks
        }

        break;
      }
    }
  }

  return [queryProperties, mutationProperties];
}

export function parseGraphQLTypeGraph(typegraph: TypeGraphDS) {
  // first type in the typegraph is always the root node and
  // its type is `object`
  const rootNode = typegraph.types[0] as ObjectNode;

  const [queryProperties, mutationProperties] = splitGraphQLOperations(
    typegraph,
    rootNode,
  );

  // clear previous properties
  rootNode.properties = {};

  // don't append `query` or `mutation` if they don't have
  // at least one property
  if (Object.keys(queryProperties).length > 0) {
    const queryIndex = addNewObjectNode(typegraph, {
      ...rootNode,
      title: "Query",
      properties: queryProperties,
    });
    rootNode.properties.query = queryIndex;
  }
  if (Object.keys(mutationProperties).length > 0) {
    const mutationIndex = addNewObjectNode(typegraph, {
      ...rootNode,
      title: "Mutation",
      properties: mutationProperties,
      config: { ...(rootNode.config ?? {}), __namespace: true },
    });
    rootNode.properties.mutation = mutationIndex;
  }
}
