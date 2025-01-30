// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Effect } from "../gen/typegraph_core.d.ts";

export type ModuleParams = {
  name: string;
  module: string;
  deps?: string[];
};

export type SimpleModuleImport = {
  name: string;
  module: string;
  deps?: string[];
  secrets?: string[];
  effect?: Effect;
};

export type ExtendedModuleImport = {
  module: ModuleParams;
  effect?: Effect;
  secrets?: string[];
};

export type ModuleImport = SimpleModuleImport | ExtendedModuleImport;

export type ModuleImportPolicy =
  | Omit<SimpleModuleImport, "effect">
  | Omit<ExtendedModuleImport, "effect">;

export class Module<T extends string> {
  path: string;
  deps?: string[];

  constructor(params: { path: string; deps?: string[]; exports?: T[] }) {
    this.path = params.path;
    this.deps = params.deps;
  }

  import(name: T): ModuleParams {
    return {
      name,
      module: this.path,
      deps: this.deps,
    };
  }
}

export function resolveModuleParams(
  params: ModuleParams | { module: ModuleParams },
) {
  if ("name" in params) {
    return {
      module: params.module,
      funcName: params.name,
      deps: params.deps ?? [],
    };
  }

  return {
    module: params.module.module,
    funcName: params.module.name,
    deps: params.module.deps ?? [],
  };
}
