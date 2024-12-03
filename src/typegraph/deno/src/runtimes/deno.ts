// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import { runtimes } from "../sdk.ts";
import type { Effect } from "../gen/runtimes.ts";
import Policy from "../policy.ts";
import { type Materializer, Runtime } from "./mod.ts";
import { fx } from "../index.ts";

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
  // deno-lint-ignore no-explicit-any
  code: string | ((...args: any[]) => any);
  secrets?: Array<string>;
  effect?: Effect;
}

export interface DenoImport {
  name: string;
  module: string;
  deps?: Array<string>;
  secrets?: Array<string>;
  effect?: Effect;
}

// deno-lint-ignore no-explicit-any
function stringifyFn(code: string | ((...any: []) => any)) {
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

  func<I extends t.Typedef = t.Typedef, O extends t.Typedef = t.Typedef>(
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

  import<I extends t.Typedef = t.Typedef, O extends t.Typedef = t.Typedef>(
    inp: I,
    out: O,
    { name, module, deps = [], effect = fx.read(), secrets = [] }: DenoImport,
  ): t.Func<I, O, ImportMat> {
    const matId = runtimes.importDenoFunction(
      {
        funcName: name,
        module,
        deps,
        secrets,
      },
      effect,
    );
    const mat: ImportMat = {
      _id: matId,
      name,
      module,
      secrets,
      effect,
    };
    return t.func(inp, out, mat);
  }

  identity<I extends t.Typedef = t.Typedef>(
    inp: I,
  ): t.Func<I, t.Typedef, PredefinedFuncMat> {
    const mat: PredefinedFuncMat = {
      _id: runtimes.getPredefinedDenoFunc({ name: "identity" }),
      name: "identity",
    };
    return t.func(inp, inp, mat);
  }

  /** use a static function already registered on the typegate */
  // deno-lint-ignore no-explicit-any
  static<P extends t.Typedef>(out: P, value: any): t.Func {
    const mat = {
      _id: runtimes.registerDenoStatic(
        {
          value: JSON.stringify(value),
        },
        out._id,
      ),
    };
    return t.func(t.struct({}), out, mat);
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
    const policyName = name ??
      `__imp_${data.module}_${data.name}`.replace(/[^a-zA-Z0-9_]/g, "_");
    return Policy.create(
      policyName,
      runtimes.importDenoFunction(
        {
          funcName: data.name,
          module: data.module,
          secrets: data.secrets ?? [],
          deps: data.deps ?? [],
        },
        fx.read(),
      ),
    );
  }
}
