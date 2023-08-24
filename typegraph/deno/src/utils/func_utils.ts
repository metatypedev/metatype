// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { InjectionSource, ValueByEffect } from "./type_utils.ts";

export function serializeInjection<T>(
  source: InjectionSource,
  value: unknown,
  valueMapper = (value: unknown) => JSON.stringify(value) as T,
) {
  return JSON.stringify({
    source,
    data: { value: valueMapper(value) },
  });
}

export function serializeInjectionByEffect<T>(
  source: InjectionSource,
  value: ValueByEffect,
  valueMapper = (value: unknown) => JSON.stringify(value) as T,
) {
  const dataEntries = Object
    .entries(value).map(([k, v]) => [k, valueMapper(v)]);

  return JSON.stringify({
    source,
    data: Object.fromEntries(dataEntries),
  });
}
