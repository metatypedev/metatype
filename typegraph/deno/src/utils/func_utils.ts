// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { InjectionSource, InjectionValueProcessorType } from "./type_utils.ts";

export function serializeInjection<T>(
  source: InjectionSource,
  type: InjectionValueProcessorType = "ByValue",
  value: unknown,
  valueMapper = (value: unknown) => JSON.stringify(value) as T,
) {
  if (type === "ByEffect") {
    return serializeInjectionByEffect<T>(source, value);
  }
  if (type === "ByValue") {
    return JSON.stringify({
      source,
      data: { value: valueMapper(value) },
    });
  }
  throw new Error(
    `"${type}" is not a valid processor type, type must be one of "ByValue", "ByEffect"`,
  );
}

function serializeInjectionByEffect<T>(
  source: InjectionSource,
  value: unknown,
  valueMapper = (value: unknown) => JSON.stringify(value) as T,
) {
  const dataEntries = Object
    .entries(value as any).map(([k, v]) => [k, valueMapper(v)]);

  return JSON.stringify({
    source,
    data: Object.fromEntries(dataEntries),
  });
}

export function serializeRecordValues<T>(
  obj: Record<string, T>,
): Array<[string, string]> {
  return Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]);
}
