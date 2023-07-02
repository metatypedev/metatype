// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { basename, dirname, fromFileUrl, join } from "std/path/mod.ts";

import { Register } from "./register.ts";
import { PrismaMigrationRuntime } from "./runtimes/prisma_migration.ts";
import { RuntimeResolver } from "./typegraph.ts";
import { getLogger } from "./log.ts";
import { pushTypegraph, TypeGateRuntime } from "./runtimes/typegate.ts";

const logger = getLogger();
const localDir = dirname(fromFileUrl(import.meta.url));

const NAME_PREFIX = "typegate/";

export class SystemTypegraph {
  readonly name: string;

  // TODO read from filesystem
  private static ids = ["typegate", "prisma_migration"];
  private static all = SystemTypegraph.ids.map((id) => new SystemTypegraph(id));
  private static customRuntimesByRegister = new Map<
    Register,
    RuntimeResolver
  >();

  constructor(private id: string) {
    this.name = id === "typegate" ? "typegate" : `${NAME_PREFIX}${id}`;
  }

  getPath() {
    return join(localDir, `typegraphs/${this.id}.json`);
  }

  static check(name: string) {
    return SystemTypegraph.all.find((sg) => sg.name == name) !=
      null;
  }

  static async loadAll(register: Register, watch = false) {
    const reload = async (paths: string[]) => {
      for await (const path of paths) {
        logger.info(`reloading system graph ${basename(path)}`);
        await pushTypegraph(await Deno.readTextFile(path), {}, register);
      }
    };

    const paths = SystemTypegraph.all.map((stg) => stg.getPath());
    await reload(paths);

    if (watch) {
      (async () => {
        const watcher = Deno.watchFs(paths);
        for await (const event of watcher) {
          if (event.kind === "modify") {
            await reload(event.paths);
          }
        }
      })(); // no await
    }
  }

  static getCustomRuntimes(register: Register) {
    const resolver = SystemTypegraph.customRuntimesByRegister.get(register);
    if (resolver != null) {
      return resolver;
    }

    SystemTypegraph.customRuntimesByRegister.set(register, {
      typegate: TypeGateRuntime.init(register),
      prisma_migration: PrismaMigrationRuntime.init(register),
    });

    return SystemTypegraph.customRuntimesByRegister.get(register);
  }
}
