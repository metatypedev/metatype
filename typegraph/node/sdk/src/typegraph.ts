// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "./types.js";
import { core } from "./gen/typegraph_core.js";
import { caller, dirname, fromFileUrl } from "./deps/mod.js";
import { InjectionValue } from "./utils/type_utils.js";
import {
  serializeFromParentInjection,
  serializeGenericInjection,
  serializeStaticInjection,
} from "./utils/injection_utils.js";
import { Auth, Cors, Rate, wit_utils } from "./wit.js";
import Policy from "./policy.js";
import { getPolicyChain } from "./types.js";

type Exports = Record<string, t.Func>;

interface TypegraphArgs {
  name: string;
  dynamic?: boolean;
  builder: TypegraphBuilder;
  prefix?: string;
  secrets?: Array<string>;
  cors?: Cors;
  rate?: Rate;
}

export interface TypegraphBuilderArgs {
  expose: (exports: Exports, defaultPolicy?: Policy) => void;
  inherit: () => InheritDef;
  rest: (graphql: string) => number;
  auth: (value: Auth | RawAuth) => number;
  ref: (name: string) => t.Typedef;
}

export class InheritDef {
  public payload: string | undefined;
  set(value: InjectionValue<unknown>) {
    this.payload = serializeStaticInjection(value);
    return this;
  }

  inject(value: InjectionValue<string>) {
    this.payload = serializeGenericInjection("dynamic", value);
    return this;
  }

  fromContext(value: InjectionValue<string>) {
    this.payload = serializeGenericInjection("context", value);
    return this;
  }

  fromSecret(value: InjectionValue<string>) {
    this.payload = serializeGenericInjection("secret", value);
    return this;
  }

  fromParent(value: InjectionValue<string>) {
    this.payload = serializeFromParentInjection(value);
    return this;
  }
}

export type TypegraphBuilder = (g: TypegraphBuilderArgs) => void;

export class RawAuth {
  constructor(readonly jsonStr: string) {}
}

export function typegraph(
  name: string,
  builder: TypegraphBuilder,
): void;
export function typegraph(
  args: TypegraphArgs,
): void;
export function typegraph(
  args: Omit<TypegraphArgs, "builder">,
  builder: TypegraphBuilder,
): void;
export function typegraph(
  nameOrArgs: string | TypegraphArgs | Omit<TypegraphArgs, "builder">,
  maybeBuilder?: TypegraphBuilder,
): void {
  const args = typeof nameOrArgs === "string"
    ? { name: nameOrArgs }
    : nameOrArgs;

  const {
    name,
    dynamic,
    cors,
    prefix,
    rate,
    secrets,
  } = args;
  const builder = "builder" in args
    ? args.builder as TypegraphBuilder
    : maybeBuilder!;

  const file = caller();
  if (!file) {
    throw new Error("Could not determine caller file");
  }
  // node/deno compat tick until MET-236 is landed
  const simpleFile = file.replace(/:[0-9]+$/, "").replace(/^file:\/\//, "");
  const path = dirname(
    fromFileUrl(
      `file://${simpleFile}`,
    ),
  );

  const tgParams = {
    prefix,
    secrets: secrets ?? [],
    cors: cors ?? {
      allowCredentials: true,
      allowHeaders: [],
      allowMethods: [],
      allowOrigin: [],
      exposeHeaders: [],
      maxAgeSec: undefined,
    } as Cors,
    rate,
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
      return wit_utils.addGraphqlEndpoint(graphql);
    },
    auth: (value: Auth | RawAuth) => {
      if (value instanceof RawAuth) {
        return wit_utils.addRawAuth(value.jsonStr);
      }
      return wit_utils.addAuth(value);
    },
    ref: (name: string) => {
      return genRef(name);
    },
  };

  builder(g);

  console.log(core.finalizeTypegraph());
}

export function genRef(name: string) {
  const value = core.refb(name, []);
  if (typeof value == "object") {
    throw new Error(JSON.stringify(value));
  }
  return new t.Typedef(value, { name });
}
