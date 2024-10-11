// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type {
  EffectType,
  InjectionDataFor_String,
} from "../../typegraph/types.ts";

export function selectInjection(
  data: InjectionDataFor_String,
  effect: EffectType,
): string | null {
  if ("value" in data) {
    return data.value;
  }

  if (effect in data) {
    return data[effect];
  }
  return null;
}
