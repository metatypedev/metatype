// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type {
  Composites,
  Cycles1,
  Primitives,
  SimpleCycles1,
  TsCompositesHandler,
  TsCyclesHandler,
  TsPrimitivesHandler,
  TsSimpleCyclesHandler,
} from "./fdk.ts";
import { QueryGraph, Transports } from "./fdk.ts";

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

export const proxy_primitives: TsPrimitivesHandler = async (inp, _ctx, tg) => {
  const qg = new QueryGraph();
  const host = Transports.hostcall(tg, qg);

  return await host.query(
    qg.tsPrimitives(inp, { _: "selectAll" }),
  );
};
