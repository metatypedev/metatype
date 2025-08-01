// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "./types.ts";
import { core } from "./sdk.ts";
import { caller, fromFileUrl } from "./deps/mod.ts";
import type { InjectionValue } from "./utils/type_utils.ts";
import {
  serializeFromParentInjection,
  serializeGenericInjection,
  serializeStaticInjection,
} from "./utils/injection_utils.ts";
import {
  type Auth,
  type Cors as CoreCors,
  type Rate,
  sdkUtils,
} from "./sdk.ts";
import { getPolicyChain } from "./types.ts";
import type { Artifact, SerializeParams } from "./gen/core.ts";
import { Manager } from "./tg_manage.ts";
import { log } from "./io.ts";
import { hasCliEnv } from "./envs/cli.ts";
import process from "node:process";

type Exports = Record<string, t.Func>;

type Cors = Partial<CoreCors>;

interface TypegraphArgs {
  name: string;
  dynamic?: boolean;
  builder: TypegraphBuilder;
  prefix?: string;
  secrets?: Array<string>;
  cors?: Cors;
  rate?: Rate;
  disableAutoSerialization?: boolean;
}

export class ApplyFromArg {
  constructor(
    public name: string | null,
    public type: number | null,
  ) {}
}

export class ApplyFromStatic {
  // deno-lint-ignore no-explicit-any
  constructor(public value: any) {}
}

export class ApplyFromSecret {
  constructor(public key: string) {}
}

export class ApplyFromContext {
  constructor(
    public key: string | null,
    public type: number | null,
  ) {}
}

export class ApplyFromParent {
  constructor(public typeName: string) {}
}

const InjectionSource = {
  asArg: (name?: string, type?: t.Typedef): ApplyFromArg =>
    new ApplyFromArg(name ?? null, type?._id ?? null),
  // deno-lint-ignore no-explicit-any
  set: (value: any): ApplyFromStatic => new ApplyFromStatic(value),
  fromSecret: (key: string): ApplyFromSecret => new ApplyFromSecret(key),
  fromContext: (key: string, type?: t.Typedef): ApplyFromContext =>
    new ApplyFromContext(key, type?._id ?? null),
  fromParent: (typeName: string): ApplyFromParent =>
    new ApplyFromParent(typeName),
} as const;

type InjectionSourceType = typeof InjectionSource;

export interface TypegraphBuilderArgs extends InjectionSourceType {
  expose: (
    exports: Exports,
    defaultPolicy?: t.PolicySpec | Array<t.PolicySpec>,
  ) => void;
  inherit: () => InheritDef;
  rest: (graphql: string) => number;
  auth: (value: Auth | RawAuth) => number;
  ref: (name: string) => t.Typedef;
  configureRandomInjection: (params: { seed: number }) => void;
}

export class InheritDef {
  public payload: string | undefined;

  /** inject static value */
  set(value: InjectionValue<unknown>): InheritDef {
    this.payload = serializeStaticInjection(value);
    return this;
  }

  /** inject a value (generic) */
  inject(value: InjectionValue<string>): InheritDef {
    this.payload = serializeGenericInjection("dynamic", value);
    return this;
  }

  /** inject from context */
  fromContext(value: InjectionValue<string>): InheritDef {
    this.payload = serializeGenericInjection("context", value);
    return this;
  }

  /** inject from secret */
  fromSecret(value: InjectionValue<string>): InheritDef {
    this.payload = serializeGenericInjection("secret", value);
    return this;
  }

  /** inject from parent */
  fromParent(value: InjectionValue<string>): InheritDef {
    this.payload = serializeFromParentInjection(value);
    return this;
  }

  /** inject from random */
  fromRandom(): InheritDef {
    this.payload = serializeGenericInjection("random", null);
    return this;
  }
}

export type TypegraphBuilder = (g: TypegraphBuilderArgs) => void;

export class RawAuth {
  constructor(readonly jsonStr: string) {}
}

export interface TypegraphOutput {
  serialize: (config: SerializeParams) => TgFinalizationResult;
  name: string;
}

export interface TgFinalizationResult {
  tgJson: string;
  ref_artifacts: Artifact[];
}

export async function typegraph(
  name: string,
  builder: TypegraphBuilder,
): Promise<TypegraphOutput>;
export async function typegraph(args: TypegraphArgs): Promise<TypegraphOutput>;
export async function typegraph(
  args: Omit<TypegraphArgs, "builder">,
  builder: TypegraphBuilder,
): Promise<TypegraphOutput>;
export async function typegraph(
  nameOrArgs: string | TypegraphArgs | Omit<TypegraphArgs, "builder">,
  maybeBuilder?: TypegraphBuilder,
): Promise<TypegraphOutput> {
  const args = typeof nameOrArgs === "string"
    ? { name: nameOrArgs }
    : nameOrArgs;

  const { name, dynamic, cors, prefix, rate, secrets } = args;
  const builder = "builder" in args
    ? (args.builder as TypegraphBuilder)
    : maybeBuilder!;

  const file = caller();
  if (!file) {
    throw new Error("Could not determine caller file");
  }
  // node/deno compat tick until MET-236 is landed
  const simpleFile = file.replace(/:[0-9]+$/, "").replace(/^file:\/\//, "");
  const path = fromFileUrl(`file://${simpleFile}`);

  const defaultCorsFields = {
    allowCredentials: true,
    allowHeaders: [],
    allowMethods: [],
    allowOrigin: [],
    exposeHeaders: [],
    maxAgeSec: undefined,
  } as CoreCors;

  const defaultRateFields = {
    localExcess: 0,
  } as { localExcess?: number };

  const tgParams = {
    prefix,
    secrets: secrets ?? [],
    cors: cors ? { ...defaultCorsFields, ...cors } : defaultCorsFields,
    rate: rate ? { ...defaultRateFields, ...rate } : undefined,
  };

  core.initTypegraph({ name, dynamic, path, ...tgParams });

  const g: TypegraphBuilderArgs = {
    expose: (exports, defaultPolicy) => {
      core.expose(
        Object.entries(exports).map(([name, fn]) => [name, fn._id]),
        defaultPolicy ? getPolicyChain(defaultPolicy) : [],
      );
    },
    inherit: () => {
      return new InheritDef();
    },
    rest: (graphql: string) => {
      return sdkUtils.addGraphqlEndpoint(graphql);
    },
    auth: (value: Auth | RawAuth) => {
      if (value instanceof RawAuth) {
        return sdkUtils.addRawAuth(value.jsonStr);
      }
      return sdkUtils.addAuth(value);
    },
    ref: (name: string) => {
      return genRef(name);
    },
    configureRandomInjection: (params: { seed: number }) => {
      return core.setSeed(params.seed);
    },
    ...InjectionSource,
  };

  try {
    builder(g);
    // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.payload && !err.cause) {
      err.cause = err.payload;
    }
    if ("cause" in err && "stack" in err.cause) {
      console.error(`Error in typegraph '${name}':`);
      for (const msg of err.cause.stack) {
        console.error(`- ${msg}`);
      }
      process.exit(1);
    }

    throw err;
  }

  const ret = {
    serialize(config: SerializeParams) {
      try {
        const [tgJson, ref_artifacts] = core.serializeTypegraph(
          config,
          // deno-lint-ignore no-explicit-any
        ) as Array<any>;
        const result: TgFinalizationResult = {
          tgJson: tgJson,
          ref_artifacts: ref_artifacts,
        };
        return result;
        // deno-lint-ignore no-explicit-any
      } catch (err: any) {
        const stack = err?.payload?.stack;
        if (stack) {
          // FIXME: jco generated code throws new Error(object) => prints [Object object]
          throw new Error(stack.join("\n"));
        }
        throw err;
      }
    },
    name,
  } as TypegraphOutput;

  if (hasCliEnv()) {
    const manager = new Manager(ret);
    await manager.run();
    log.debug("exiting");
  }

  return ret;
}

/** generate a type reference (by name) */
export function genRef(name: string): t.Typedef {
  const value = core.refb(name);
  if (typeof value == "object") {
    throw new Error(JSON.stringify(value));
  }
  return new t.Typedef(value);
}
