// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { TypeGraphDS } from "../../typegraph/mod.ts";
import type { ObjectNode } from "../../typegraph/type_node.ts";
import { Type } from "../../typegraph/type_node.ts";
import { PolicyIndices } from "../../typegraph/types.ts";
import { addNode } from "./utils.ts";

type PropertiesTable = Record<string, number>;

type SplitResult = {
  queries: {
    properties: PropertiesTable;
    policies: Record<string, PolicyIndices[]>;
  };
  mutations: {
    properties: PropertiesTable;
    policies: Record<string, PolicyIndices[]>;
  };
};

/**
 * Splits a TypeGraph into GraphQL `queries` and `mutations`
 */
function splitGraphQLOperations(
  typegraph: TypeGraphDS,
  node: ObjectNode,
): SplitResult {
  const res: SplitResult = {
    queries: { properties: {}, policies: {} },
    mutations: { properties: {}, policies: {} },
  };

  if (typegraph.meta.namespaces == null) {
    typegraph.meta.namespaces = [];
  }
  const namespaces = typegraph.meta.namespaces;

  for (const [propertyName, typeIndex] of Object.entries(node.properties)) {
    const childNode = typegraph.types[typeIndex];

    // if the leaf node of a path is a function
    // with a materializer that has an effect other than `read`,
    // classify the root node of this path as a `mutation`
    // otherwise as a `query`
    switch (childNode.type) {
      case "object": {
        const child = splitGraphQLOperations(
          typegraph,
          childNode,
        );

        if (Object.keys(child.queries.properties).length === 0) {
          res.mutations.properties[propertyName] = typeIndex;
          namespaces.push(typeIndex);
        } else if (Object.keys(child.mutations.properties).length === 0) {
          res.queries.properties[propertyName] = typeIndex;
          namespaces.push(typeIndex);
        } else {
          res.queries.properties[propertyName] = addNode(typegraph, {
            ...node,
            title: `${node.title}_q`,
            properties: child.queries.properties,
            policies: child.queries.policies,
          });
          namespaces.push(res.queries.properties[propertyName]);
          res.mutations.properties[propertyName] = addNode(typegraph, {
            ...node,
            title: `${node.title}_m`,
            properties: child.mutations.properties,
            policies: child.mutations.policies,
          });
          namespaces.push(res.mutations.properties[propertyName]);
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
          res.queries.properties[propertyName] = typeIndex;
          if (propertyName in (node.policies ?? {})) {
            res.queries.policies[propertyName] = node.policies![propertyName];
          }
          // TODO additional checks
        } else {
          res.mutations.properties[propertyName] = typeIndex;
          if (propertyName in (node.policies ?? {})) {
            res.mutations.policies[propertyName] = node.policies![propertyName];
          }
          // TODO additional checks
        }

        break;
      }
    }
  }

  return res;
}

export function parseGraphQLTypeGraph(tgOrig: TypeGraphDS): TypeGraphDS {
  // first type in the typegraph is always the root node and
  // its type is `object`
  const rootNode = tgOrig.types[0] as ObjectNode;

  const typegraph = {
    ...tgOrig,
    types: [...tgOrig.types],
  };

  const { queries, mutations } = splitGraphQLOperations(
    typegraph,
    rootNode,
  );

  // clear previous properties
  rootNode.properties = {};

  // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
  const queryIndex = addNode(typegraph, {
    ...rootNode,
    title: "Query",
    ...queries,
  });
  typegraph.meta.namespaces!.push(queryIndex);
  rootNode.properties.query = queryIndex;

  if (Object.keys(mutations.properties).length > 0) {
    const mutationIndex = addNode(typegraph, {
      ...rootNode,
      title: "Mutation",
      ...mutations,
    });
    typegraph.meta.namespaces!.push(mutationIndex);
    rootNode.properties.mutation = mutationIndex;
  }

  return typegraph;
}

// TEMPORARY
export function setNamespaces(tg: TypeGraphDS) {
  if (tg.meta.namespaces != null) {
    return;
  }
  const namespaces: number[] = [];

  const rootNode = tg.types[0] as ObjectNode;

  const addNamespacesFrom = (node: ObjectNode, nodeIdx: number) => {
    namespaces.push(nodeIdx);
    for (const [, typeIdx] of Object.entries(node.properties)) {
      const childNode = tg.types[typeIdx];
      if (childNode.type === Type.OBJECT) {
        addNamespacesFrom(childNode, typeIdx);
      }
    }
  };

  addNamespacesFrom(rootNode, 0);
  tg.meta.namespaces = namespaces;
}
