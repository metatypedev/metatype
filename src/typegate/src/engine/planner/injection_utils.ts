// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { EffectType, InjectionData } from "../../typegraph/types.ts";

export function selectInjection<T = string>(
  data: InjectionData,
  effect: EffectType,
): T | null {
  if ("value" in data) {
    return data.value as T;
  }

  if (effect in data) {
    return data[effect] as T;
  }
  return null;
}
