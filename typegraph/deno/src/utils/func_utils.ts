// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { CREATE, DELETE, effectPrefix, NONE, UPDATE } from "../effects.ts";
import { InjectionSource, InjectionValue } from "./type_utils.ts";

export function serializeInjection(
  source: InjectionSource,
  value: InjectionValue<unknown>,
  valueMapper = (value: InjectionValue<unknown>) => value,
) {
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    value !== null
  ) {
    const allowedKeys = [UPDATE, DELETE, CREATE, NONE];
    const isPerEffect = Object.keys(value).every((propName) =>
      allowedKeys.includes(propName)
    );
    if (isPerEffect) {
      const dataEntries = Object
        .entries(value).map((
          [k, v],
        ) => [k.split(effectPrefix).pop(), valueMapper(v)]);
      return JSON.stringify({
        source,
        data: Object.fromEntries(dataEntries),
      });
    }
  }

  return JSON.stringify({
    source,
    data: { value: valueMapper(value) },
  });
}

export function serializeRecordValues<T>(
  obj: Record<string, T>,
): Array<[string, string]> {
  return Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]);
}
