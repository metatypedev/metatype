// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// jsr-private-module

import { CREATE, DELETE, READ, UPDATE } from "../effects.ts";
import type { InjectionSource, InjectionValue } from "./type_utils.ts";
import { stringifySymbol } from "./func_utils.ts";

export function serializeInjection(
  source: InjectionSource,
  value: InjectionValue<unknown>,
  valueMapper = (value: InjectionValue<unknown>) => value,
) {
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    // Note:
    // Symbol changes the behavior of keys, values, entries => props are skipped
    const symbols = [UPDATE, DELETE, CREATE, READ];
    const noOtherType = Object.keys(value).length == 0;
    const isPerEffect = noOtherType &&
      symbols.some((symbol) =>
        (value as Record<symbol, unknown>)?.[symbol] !== undefined
      );

    if (isPerEffect) {
      const dataEntries = symbols.map((symbol) => {
        const valueGiven = (value as Record<symbol, unknown>)?.[symbol];
        return [stringifySymbol(symbol), valueGiven && valueMapper(valueGiven)];
      });

      return JSON.stringify({
        source,
        data: Object.fromEntries(dataEntries),
      });
    }
  }

  if (value === null) {
    return JSON.stringify({ source, data: { value: null } });
  }
  return JSON.stringify({
    source,
    data: { value: valueMapper(value) },
  });
}

export function serializeGenericInjection(
  source: InjectionSource,
  value: InjectionValue<unknown>,
): string {
  const allowed: InjectionSource[] = ["dynamic", "context", "secret", "random"];
  if (allowed.includes(source)) {
    return serializeInjection(source, value);
  }
  throw new Error(`source must be one of ${allowed.join(", ")}`);
}

export function serializeStaticInjection(value: InjectionValue<unknown>) {
  return serializeInjection("static", value, (x: unknown) => JSON.stringify(x));
}

export function serializeFromParentInjection(
  value: InjectionValue<string>,
): string {
  if (typeof value !== "string") {
    const isObject = typeof value === "object" && !Array.isArray(value) &&
      value !== null;
    if (!isObject) {
      throw new Error("type not supported");
    }

    // Note:
    // Symbol changes the behavior of keys, values, entries => props are skipped
    const symbols = [UPDATE, DELETE, CREATE, READ];
    const noOtherType = Object.keys(value).length == 0;
    const isPerEffect = noOtherType &&
      symbols.some((symbol) =>
        (value as Record<symbol, unknown>)?.[symbol] !== undefined
      );

    if (!isPerEffect) {
      throw new Error("object keys should be of type EffectType");
    }
  }

  return serializeInjection(
    "parent",
    value,
    (x: unknown) => x as number,
  );
}
