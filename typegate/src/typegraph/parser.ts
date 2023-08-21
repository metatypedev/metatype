// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { TypeGraphDS } from "../typegraph/mod.ts";
import { typegraph_validate } from "native";

export async function parseTypegraph(json: string): Promise<TypeGraphDS> {
  const res = await typegraph_validate({ json });
  if ("Valid" in res) {
    return JSON.parse(res.Valid.json) as TypeGraphDS;
  } else {
    throw new Error(`Invalid typegraph definition: ${res.NotValid.reason}`);
  }
}
