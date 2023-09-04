// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { CREATE, DELETE, NONE, UPDATE } from "../effects.ts";
import { InjectionSource, InjectionValue } from "./type_utils.ts";

export function stringifySymbol(symbol: symbol) {
  const name = symbol.toString().match(/\((.+)\)/)?.[1];
  if (!name) {
    throw new Error("unable to determine symbol name");
  }
  return name;
}

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
    // Note:
    // Symbol changes the behavior of keys, values, entries => props are skipped
    const symbols = [UPDATE, DELETE, CREATE, NONE];
    const noOtherType = Object.keys(value).length == 0;
    const isPerEffect = noOtherType &&
      symbols
        .some((symbol) => (value as any)?.[symbol] !== undefined);

    if (isPerEffect) {
      const dataEntries = symbols.map(
        (symbol) => {
          const valueGiven = (value as any)?.[symbol];
          return [
            stringifySymbol(symbol),
            valueGiven && valueMapper(valueGiven),
          ];
        },
      );

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
