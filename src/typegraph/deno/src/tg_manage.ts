// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { SerializeParams } from "./gen/core.ts";
import type { TypegraphOutput } from "./typegraph.ts";
import { log } from "./io.ts";
import { type CliEnv, getCliEnv } from "./envs/cli.ts";
import * as path from "node:path";
import { rpcRequest } from "./gen/client.ts";

type DeployParams = {
  typegraphName: string;
  typegraphPath: string;
  prefix?: string;
  migrationDir: string;
};

export class Manager {
  #typegraph: TypegraphOutput;
  #env: CliEnv;

  constructor(typegraph: TypegraphOutput) {
    this.#typegraph = typegraph;
    this.#env = getCliEnv();
  }

  async run() {
    switch (this.#env.command) {
      case "serialize":
        this.#serialize();
        break;
      case "deploy":
        this.#deploy();
        break;
      case "list":
        this.#list();
        break;
      default:
        throw new Error(
          `command ${this.#env.command} from meta-cli not supported`,
        );
    }
  }

  #getMigrationsDir(): string {
    return path.join(this.#env.migrations_dir, this.#typegraph.name);
  }

  #serialize(): void {
    const env = this.#env;

    const params: SerializeParams = {
      typegraphName: this.#typegraph.name,
      typegraphPath: env.typegraph_path,
      prefix: env.prefix,
      artifactResolution: env.artifact_resolution,
      codegen: false,
      prismaMigration: {
        migrationsDir: this.#getMigrationsDir(),
        migrationActions: [],
        defaultMigrationAction: {
          apply: true,
          create: false,
          reset: false,
        },
      },
      pretty: false,
    };

    rpcRequest("Serialize", params);
  }

  #deploy() {
    const env = this.#env;
    if (!env.artifact_resolution) {
      log.failure({
        typegraph: this.#typegraph.name,
        errors: ["artifact resolution must be enabled for deployment"],
      });
      return;
    }

    const params: DeployParams = {
      typegraphName: this.#typegraph.name,
      typegraphPath: env.typegraph_path,
      prefix: env.prefix,
      migrationDir: env.migrations_dir,
    };

    rpcRequest("Deploy", params);
  }

  #list() {
    log.success({ typegraph: this.#typegraph.name });
  }
}
