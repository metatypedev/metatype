// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import { runtimes, wit_utils } from "../wit.js";
import { Effect } from "../gen/interfaces/metatype-typegraph-runtimes.js";
import Policy from "../policy.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../index.js";

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
  code: string | Function;
  secrets?: Array<string>;
  effect?: Effect;
}

export interface DenoImport {
  name: string;
  module: string;
  secrets?: Array<string>;
  effect?: Effect;
}

function stringifyFn(code: string | Function) {
  if (typeof code == "function") {
    const source = code.toString();
    const namedFnMatch = source.match(/function\s*(\*?\s*[a-zA-Z0-9_]+)/);
    if (namedFnMatch) {
      const [, name] = namedFnMatch;
      if (name.replace(/\s/g, "").startsWith("*")) {
        throw new Error(`Generator function "${name}" not supported`);
      }
      if (/function\s[a-zA-Z0-9_]+\(\) { \[native code\] }/.test(source)) {
        throw new Error(
          `"${name}" is not supported as it is a native function`,
        );
      }
    }
    return source;
  }
  return code;
}

export class DenoRuntime extends Runtime {
  constructor() {
    super(runtimes.getDenoRuntime());
  }

  func<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { code, secrets = [], effect = fx.read() }: DenoFunc,
  ): t.Func<I, O, FunMat> {
    const source = stringifyFn(code);
    const matId = runtimes.registerDenoFunc({ code: source, secrets }, effect);
    const mat: FunMat = {
      _id: matId,
      code: source,
      secrets,
      effect,
    };
    return t.func(inp, out, mat);
  }

  import<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    { name, module, effect = fx.read(), secrets = [] }: DenoImport,
  ): t.Func<I, O, ImportMat> {
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
    I extends t.Typedef = t.Typedef,
  >(inp: I): t.Func<I, t.Typedef, PredefinedFuncMat> {
    const mat: PredefinedFuncMat = {
      _id: runtimes.getPredefinedDenoFunc({ name: "identity" }),
      name: "identity",
    };
    // const out = wit_utils.removeInjections(inp._id);
    return t.func(
      inp,
      inp,
      mat,
    );
  }

  static<
    P extends t.Typedef,
  >(out: P, value: any) {
    const mat = {
      _id: runtimes.registerDenoStatic({
        value: JSON.stringify(value),
      }, out._id),
    };
    return t.func(
      t.struct({}),
      out,
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
      runtimes.registerDenoFunc(
        { ...params, code: stringifyFn(params.code) },
        fx.read(),
      ),
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
