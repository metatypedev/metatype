// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "./types.ts";
import { core } from "../gen/typegraph_core.js";
import { caller, dirname, fromFileUrl } from "./deps.ts";
import { InjectionValue } from "./utils/type_utils.ts";
import {
  serializeFromParentInjection,
  serializeGenericInjection,
  serializeStaticInjection,
} from "./utils/injection_utils.ts";

type Exports = Record<string, t.Func>;

interface TypegraphArgs {
  name: string;
  dynamic?: boolean;
  folder?: string;
  builder: TypegraphBuilder;
}

interface TypegraphBuilderArgs {
  expose: (exports: Exports) => void;
  inherit: () => InheritDef;
}

export class InheritDef {
  constructor(public payload: string | undefined = undefined) {}
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

  const { name, dynamic, folder } = args;
  const builder = "builder" in args
    ? args.builder as TypegraphBuilder
    : maybeBuilder!;

  const file = caller();
  if (!file) {
    throw new Error("Could not determine caller file");
  }
  const path = dirname(fromFileUrl(file));

  core.initTypegraph({ name, dynamic, path, folder });

  const g: TypegraphBuilderArgs = {
    expose: (exports) => {
      core.expose(
        Object.entries(exports).map(([name, fn]) => [name, fn._id]),
        [],
      );
    },
    inherit: () => {
      return new InheritDef();
    },
  };

  builder(g);

  console.log(core.finalizeTypegraph());
}
