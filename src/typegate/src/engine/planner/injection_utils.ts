// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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

export function getInjectionValues<T = string>(
  data: InjectionData,
): T[] {
  if ("value" in data) {
    return [data.value as T];
  }

  return Object.values(data).filter((v) => typeof v === "string") as T[];
}
