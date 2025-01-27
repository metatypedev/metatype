// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeKind } from "graphql";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import { ObjectNode, PolicyIndices } from "../../typegraph/types.ts";
import { isScalar, type TypeNode } from "../../typegraph/type_node.ts";

// Note: graphql UNION output does not support scalars, only OBJECT
export function genOutputScalarVariantWrapper(type: TypeNode, idx: number) {
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
  return typeGenericCustomScalar(
    "EmptyObject",
    "object scalar type representing an empty object",
  );
}

export function fieldCommon() {
  return {
    // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L207
    name: () => null,
    specifiedByURL: () => null,
    // logic at https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L453-L490
    ofType: () => null,
    inputFields: () => null,
    fields: () => null,
    interfaces: () => null,
    possibleTypes: () => null,
    enumValues: () => null,
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

export function typeGenericCustomScalar(name: string, description: string) {
  return {
    kind: () => TypeKind.SCALAR,
    name: () => name,
    description: () => description,
    fields: () => {},
    inputFields: () => {},
    interfaces: () => {},
    enumValues: () => {},
    possibleTypes: () => {},
  };
}
