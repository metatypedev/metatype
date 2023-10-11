// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "./types.ts";
import { core } from "./gen/typegraph_core.js";
import { caller, dirname, fromFileUrl } from "./deps.ts";
import { InjectionValue } from "./utils/type_utils.ts";
import {
  serializeFromParentInjection,
  serializeGenericInjection,
  serializeStaticInjection,
} from "./utils/injection_utils.ts";
import { Auth, Cors, Rate, wit_utils } from "./wit.ts";
import Policy from "./policy.ts";
import { getPolicyChain } from "./types.ts";

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

interface TypegraphBuilderArgs {
  expose: (exports: Exports, defaultPolicy?: Policy) => void;
  inherit: () => InheritDef;
  rest: (graphql: string) => number;
  auth: (value: Auth) => number;
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

type TypegraphBuilder = (g: TypegraphBuilderArgs) => void;

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
    auth: (value: Auth) => {
      return wit_utils.addAuth(value);
    },
  };

  builder(g);

  console.log(core.finalizeTypegraph());
}
