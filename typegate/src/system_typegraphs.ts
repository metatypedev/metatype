// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { basename } from "std/url/mod.ts";
import { fromFileUrl, toFileUrl } from "std/path/mod.ts";

import { Register } from "./typegate/register.ts";
import { PrismaMigrationRuntime } from "./runtimes/prisma/mod.ts";
import { RuntimeResolver, TypeGraph } from "./typegraph/mod.ts";
import { getLogger } from "./log.ts";
import { TypeGateRuntime } from "./runtimes/typegate.ts";
import { Typegate } from "./typegate/mod.ts";

const logger = getLogger();

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

  getUrl() {
    return import.meta.resolve(`./typegraphs/${this.id}.json`);
  }

  static check(name: string) {
    return SystemTypegraph.all.find((sg) => sg.name == name) !=
      null;
  }

  static async loadAll(typegate: Typegate, watch = false) {
    const reload = async (urls: string[]) => {
      for await (const url of urls) {
        logger.info(`reloading system graph ${basename(url)}`);
        const json = (await import(url, {
          with: { type: "json" },
        })).default;
        const tgString = JSON.stringify(json);
        const tgJson = await TypeGraph.parseJson(tgString);
        await typegate.pushTypegraph(
          tgJson,
          {},
          true, // introspection
          true, // system
        );
      }
    };

    const urls = SystemTypegraph.all.map((stg) => stg.getUrl());
    await reload(urls);

    if (watch && new URL(import.meta.url).protocol == "file:") {
      void (async () => {
        const watcher = Deno.watchFs(urls.map(fromFileUrl));
        for await (const event of watcher) {
          if (event.kind === "modify") {
            await reload(event.paths.map(toFileUrl).map((url) => url.href));
          }
        }
      })(); // no await
    }
  }

  static getCustomRuntimes(typegate: Typegate) {
    const resolver = SystemTypegraph.customRuntimesByRegister.get(
      typegate.register,
    );
    if (resolver != null) {
      return resolver;
    }

    SystemTypegraph.customRuntimesByRegister.set(typegate.register, {
      typegate: TypeGateRuntime.init(typegate),
      prisma_migration: PrismaMigrationRuntime.init(typegate.register),
    });

    return SystemTypegraph.customRuntimesByRegister.get(typegate.register);
  }
}
