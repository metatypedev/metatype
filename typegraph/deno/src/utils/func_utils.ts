// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { CREATE, DELETE, effectPrefix, NONE, UPDATE } from "../effects.ts";
import { InjectionSource } from "./type_utils.ts";

export function serializeInjection<T>(
  source: InjectionSource,
  value: unknown,
  valueMapper = (value: unknown) => JSON.stringify(value) as T,
) {
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    value !== null
  ) {
    const allowedKeys = [UPDATE, DELETE, CREATE, NONE];
    const isByEffect = Object.keys(value).every((value) =>
      allowedKeys.includes(value)
    );
    if (isByEffect) {
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
