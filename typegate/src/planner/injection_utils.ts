// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  EffectType,
  InjectionDataFor_String,
  InjectionDataForUint32,
} from "../types/typegraph.ts";

export function selectInjection(
  data: InjectionDataForUint32,
  effect: EffectType,
): number | null;
export function selectInjection(
  data: InjectionDataFor_String,
  effect: EffectType,
): string | null;
export function selectInjection(
  data: InjectionDataFor_String | InjectionDataForUint32,
  effect: EffectType,
): number | string | null {
  if ("value" in data) {
    return data.value;
  }

  if (effect in data) {
    return data[effect];
  }
  return null;
}
