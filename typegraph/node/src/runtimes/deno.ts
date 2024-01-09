// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import Policy from "../policy.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../mod.js";

interface FunMat extends Materializer {
  code: string;
  secrets: string[];
  effect: Effect;
}

interface ImportMat extends Materializer {
  name: string;
  module: string;
  secrets: string[];
  effect: Effect;
}

interface PredefinedFuncMat extends Materializer {
  name: string;
}

export interface DenoFunc {
  code: string;
  secrets?: Array<string>;
  effect?: Effect;
}

export interface DenoImport {
  name: string;
  module: string;
  secrets?: Array<string>;
  effect?: Effect;
}

export class DenoRuntime extends Runtime {
  constructor() {
    super(runtimes.getDenoRuntime());
  }

  func<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { code, secrets = [], effect = fx.read() }: DenoFunc,
  ): t.Func<P, I, O, FunMat> {
    const matId = runtimes.registerDenoFunc({ code, secrets }, effect);
    const mat: FunMat = {
      _id: matId,
      code,
      secrets,
      effect,
    };
    return t.func(inp, out, mat);
  }

  import<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { name, module, effect = fx.read(), secrets = [] }: DenoImport,
  ): t.Func<P, I, O, ImportMat> {
    const matId = runtimes.importDenoFunction({
      funcName: name,
      module,
      secrets,
    }, effect);
    const mat: ImportMat = {
      _id: matId,
      name,
      module,
      secrets,
      effect,
    };
    return t.func(inp, out, mat);
  }

  identity<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
  >(inp: I): t.Func<P, I, I, PredefinedFuncMat> {
    const mat: PredefinedFuncMat = {
      _id: runtimes.getPredefinedDenoFunc({ name: "identity" }),
      name: "identity",
    };
    return t.func(
      inp,
      inp,
      mat,
    );
  }

  policy(name: string, _code: string): Policy;
  policy(name: string, data: Omit<DenoFunc, "effect">): Policy;
  policy(name: string, data: string | Omit<DenoFunc, "effect">): Policy {
    const params = typeof data === "string"
      ? { code: data, secrets: [] }
      : { secrets: [], ...data };

    return Policy.create(
      name,
      runtimes.registerDenoFunc(params, fx.read()),
    );
  }

  importPolicy(data: Omit<DenoImport, "effect">, name?: string): Policy {
    const policyName = name ?? `__imp_${data.module}_${data.name}`.replace(
      /[^a-zA-Z0-9_]/g,
      "_",
    );
    return Policy.create(
      policyName,
      runtimes.importDenoFunction({
        funcName: data.name,
        module: data.module,
        secrets: data.secrets ?? [],
      }, fx.read()),
    );
  }
}
