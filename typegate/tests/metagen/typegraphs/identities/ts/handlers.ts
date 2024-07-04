// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type {
  Composites,
  Cycles1,
  Primitives,
  SimpleCycles1,
  TsCompositesHandler,
  TsCyclesHandler,
  TsPrimitivesHandler,
  TsSimpleCyclesHandler,
} from "./mdk.ts";

export const primitives: TsPrimitivesHandler = (inp, _ctx, _tg) => {
  const out: Primitives = {
    ...inp.data,
  };
  return out;
};

export const cycles: TsCyclesHandler = (inp, _ctx, _tg) => {
  const out: Cycles1 = {
    ...inp.data,
  };
  return out;
};

export const composites: TsCompositesHandler = (inp, _ctx, _tg) => {
  const out: Composites = {
    ...inp.data,
  };
  return out;
};

export const simple_cycles: TsSimpleCyclesHandler = (inp, _ctx, _tg) => {
  const out: SimpleCycles1 = {
    ...inp.data,
  };
  return out;
};
