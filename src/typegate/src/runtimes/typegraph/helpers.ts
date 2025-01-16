// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeKind } from "graphql";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import { ObjectNode, PolicyIndices } from "../../typegraph/types.ts";
import { isScalar, type TypeNode } from "../../typegraph/type_node.ts";

export function typeCustomScalar(type: TypeNode, idx: number) {
  if (isScalar(type)) {
    const id = type.type;
    return {
      title: `_${id[0].toUpperCase()}${id.slice(1)}`,
      type: "object",
      properties: {
        [id]: idx,
      },
    } as ObjectNode;
  }
  throw `"${type.title}" of type "${type.type}" is not a scalar`;
}

export function typeEmptyObjectScalar() {
  return {
    kind: () => TypeKind.SCALAR,
    name: () => "EmptyObject",
    description: () => "object scalar type representing an empty object",
    fields: () => {},
    inputFields: () => {},
    interfaces: () => {},
    enumValues: () => {},
    possibleTypes: () => {},
  };
}

export function policyDescription(
  tg: TypeGraphDS,
  policies: PolicyIndices[],
): string {
  const describeOne = (p: number) => tg.policies[p].name;
  const describe = (p: PolicyIndices) => {
    if (typeof p === "number") {
      return describeOne(p);
    }
    return Object.entries(p)
      .map(([eff, polIdx]) => `${eff}:${describeOne(polIdx)}`)
      .join("; ");
  };
  const policyNames = policies.map(describe);

  let ret = "\n\nPolicies:\n";

  if (policyNames.length > 0) {
    ret += policyNames.map((p: string) => `- ${p}`).join("\n");
  } else {
    ret += "- inherit";
  }

  return ret;
}
