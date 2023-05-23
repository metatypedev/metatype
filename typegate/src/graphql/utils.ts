// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraphDS } from "../typegraph.ts";
import { TypeNode } from "../type_node.ts";

/**
 * Returns true if the given `type` already exists in the `TypeGraph`.
 */
function existsType(typegraph: TypeGraphDS, name: string): boolean {
  for (const node of typegraph.types) {
    if (node.title === name) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the name and its counter value from a string with a expected format
 * of `name_counter`.
 */
function getDuplicatedCounter(name: string): [string, number] {
  // expected format `name_counter`
  const split = name.split("_");
  const duplicated_count = +split.at(-1)!;

  // when there is not a counter
  // use default counter
  if (isNaN(duplicated_count)) {
    return [name, 0];
  }

  // trim counter
  name = split.slice(0, -1).join("_");

  return [name, duplicated_count];
}

/**
 * Returns a new name from the provided one, which is not already taken in the
 * `TypeGraph`.
 */
function getDeduplicatedName(typegraph: TypeGraphDS, _name: string): string {
  const [name, duplicated_count] = getDuplicatedCounter(_name);
  const deduplicated_name = `${name}_${duplicated_count + 1}`;

  if (existsType(typegraph, deduplicated_name)) {
    return getDeduplicatedName(typegraph, deduplicated_name);
  }

  return deduplicated_name;
}

/**
 * Appends a new node to the end of the TypeGraph, and returns its index.
 */
export function addNode(typegraph: TypeGraphDS, node: TypeNode): number {
  const { types } = typegraph;
  if (existsType(typegraph, node.title)) {
    node.title = getDeduplicatedName(typegraph, node.title);
  }
  types.push(node);
  return types.length - 1;
}
