// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraphDS } from "../typegraph.ts";
import { isObject, TypeNode } from "../type_node.ts";

export function isInjected(tg: TypeGraphDS, t: TypeNode): boolean {
  return t.injection != null ||
    (isObject(t) && (t.properties.length > 0 &&
      Object.values(t.properties).map((propIdx) => tg.types[propIdx])
        .every((nested) => isInjected(tg, nested))));
}
