// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS } from "../typegraph.ts";
import { ObjectNode } from "../type_node.ts";

type PropertiesTable = Record<string, number>;

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
        const [childQueryProperties, _childMutationProperties] =
          splitGraphQLOperations(
            typegraph,
            childNode,
          );

        // check if child node is a `query` or `mutation` property
        if (Object.keys(childQueryProperties).length > 0) {
          queryProperties[propertyName] = typeIndex;
        } else {
          mutationProperties[propertyName] = typeIndex;
        }

        break;
      }

      case "function": {
        const childMaterializer =
          typegraph.materializers[childNode.materializer];

        if (!childMaterializer.data.serial) {
          queryProperties[propertyName] = typeIndex;
        } else {
          mutationProperties[propertyName] = typeIndex;
        }

        break;
      }
    }
  }

  return [queryProperties, mutationProperties];
}

function newObjectNodeBase() {
  const objectNodeBase = {
    type: "object",
    title: "",
    properties: {},
    // use any runtime, `ObjectNode`s
    // don't have data to compute,
    // therefore the runtime is never used
    runtime: -1,
    policies: [],
  } as ObjectNode;

  return objectNodeBase;
}

export function parseGraphQLTypeGraph(typegraph: TypeGraphDS) {
  // first type in the typegraph is always the root node and
  // its type is `object`
  const rootNode = typegraph.types[0] as ObjectNode;

  const [queryProperties, mutationProperties] = splitGraphQLOperations(
    typegraph,
    rootNode,
  );

  const queryType = newObjectNodeBase();
  queryType.title = "Query";
  queryType.properties = queryProperties;

  const mutationType = newObjectNodeBase();
  mutationType.title = "Mutation";
  mutationType.properties = mutationProperties;

  // add new types to the typegraph and save their type indexes
  const queryIndex = typegraph.types.push(queryType) - 1;
  const mutationIndex = typegraph.types.push(mutationType) - 1;

  rootNode.properties = {
    query: queryIndex,
    mutation: mutationIndex,
  };
}
