// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraphDS } from "../../typegraph/mod.ts";
import { ObjectNode } from "../../typegraph/type_node.ts";
import { addNode } from "./utils.ts";

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
    // with a materializer that has an effect,
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
          mutationProperties[propertyName] = typeIndex;
          childNode.config = Object.assign(childNode.config ?? {}, {
            __namespace: true,
          });
        } else if (Object.keys(childMutationProperties).length === 0) {
          queryProperties[propertyName] = typeIndex;
          childNode.config = Object.assign(childNode.config ?? {}, {
            __namespace: true,
          });
        } else {
          queryProperties[propertyName] = addNode(typegraph, {
            ...node,
            title: `${node.title}_q`,
            properties: childQueryProperties,
            config: { ...(node.config ?? {}), __namespace: true },
          });
          mutationProperties[propertyName] = addNode(typegraph, {
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

        if (
          // TODO effect should always be defined
          childMaterializer.effect.effect === null ||
          childMaterializer.effect.effect === "read"
        ) {
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

export function parseGraphQLTypeGraph(tgOrig: TypeGraphDS): TypeGraphDS {
  // first type in the typegraph is always the root node and
  // its type is `object`
  const rootNode = tgOrig.types[0] as ObjectNode;

  const typegraph = {
    ...tgOrig,
    types: [...tgOrig.types],
  };

  const [queryProperties, mutationProperties] = splitGraphQLOperations(
    typegraph,
    rootNode,
  );

  // clear previous properties
  rootNode.properties = {};

  // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
  const queryIndex = addNode(typegraph, {
    ...rootNode,
    title: "Query",
    properties: queryProperties,
    config: { ...(rootNode.config ?? {}), __namespace: true },
  });
  rootNode.properties.query = queryIndex;

  if (Object.keys(mutationProperties).length > 0) {
    const mutationIndex = addNode(typegraph, {
      ...rootNode,
      title: "Mutation",
      properties: mutationProperties,
      config: { ...(rootNode.config ?? {}), __namespace: true },
    });
    rootNode.properties.mutation = mutationIndex;
  }

  return typegraph;
}
