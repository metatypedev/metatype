// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "./types.ts";
import { core } from "../gen/typegraph_core.js";
import { caller, dirname, fromFileUrl } from "./deps.ts";
import { Auth, Cors, Rate } from "./wit.ts";

type Exports = Record<string, t.Func>;

interface TypegraphArgs {
  name: string;
  dynamic?: boolean;
  folder?: string;
  builder: TypegraphBuilder;
  prefix?: string;
  secrets?: Array<string>;
  cors?: Cors;
  auths?: Array<Auth>;
  rate?: Array<Rate>;
}

interface TypegraphBuilderArgs {
  expose: (exports: Exports) => void;
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
    folder,
    auths,
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
  const path = dirname(fromFileUrl(file));

  const tgParams = {
    prefix,
    secrets: secrets ?? [],
    cors: cors ?? {
      allowCredentials: false,
      allowHeaders: [],
      allowMethods: [],
      allowOrigin: [],
      exposeHeaders: [],
      maxAgeSec: undefined,
    } as Cors,
    auths: auths ?? [],
    rate,
  };

  core.initTypegraph({ name, dynamic, path, folder, ...tgParams });

  const g: TypegraphBuilderArgs = {
    expose: (exports) => {
      core.expose(
        Object.entries(exports).map(([name, fn]) => [name, fn._id]),
        [],
      );
    },
  };

  builder(g);

  console.log(core.finalizeTypegraph());
}
