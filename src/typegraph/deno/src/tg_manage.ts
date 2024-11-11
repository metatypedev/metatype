// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { SerializeParams } from "./gen/typegraph_core.d.ts";
import { BasicAuth, tgDeploy } from "./tg_deploy.ts";
import type { TgFinalizationResult, TypegraphOutput } from "./typegraph.ts";
import { freezeTgOutput } from "./utils/func_utils.ts";
import { log, rpc } from "./io.ts";
import { type CliEnv, getCliEnv } from "./envs/cli.ts";
import * as path from "node:path";

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
        await this.#deploy();
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
    let finalizationResult: TgFinalizationResult;
    try {
      const env = this.#env;
      finalizationResult = this.#typegraph.serialize({
        typegraphPath: env.typegraph_path,
        prefix: env.prefix,
        artifactResolution: this.#env.artifact_resolution,
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
      });
      log.success(finalizationResult.tgJson, true);
    } catch (err) {
      log.failure({
        typegraph: this.#typegraph.name,
        errors: getErrorStack(err, "failed to serialize typegraph"),
      });
    }
  }

  async #deploy(): Promise<void> {
    try {
      const deployData = await rpc.getDeployData(this.#typegraph.name);

      const env = this.#env;
      if (!env.artifact_resolution) {
        log.failure({
          typegraph: this.#typegraph.name,
          errors: ["artifact resolution must be enabled for deployment"],
        });
        return;
      }

      const params: SerializeParams = {
        typegraphPath: env.typegraph_path,
        prefix: env.prefix,
        artifactResolution: true,
        codegen: false,
        prismaMigration: {
          migrationsDir: this.#getMigrationsDir(),
          migrationActions: Object.entries(deployData.migrationActions),
          defaultMigrationAction: deployData.defaultMigrationAction,
        },
        pretty: false,
      };

      // hack for allowing tg.serialize(config) to be called more than once
      const frozenOut = freezeTgOutput(params, this.#typegraph);

      // hack for allowing tg.serialize(config) to be called more than once
      let frozenSerialized: TgFinalizationResult;
      try {
        frozenSerialized = frozenOut.serialize(params);
      } catch (err) {
        log.failure({
          typegraph: this.#typegraph.name,
          errors: getErrorStack(err, "failed to serialize typegraph"),
        });
        return;
      }
      const reusableTgOutput = {
        ...this.#typegraph,
        serialize: () => frozenSerialized,
      } as TypegraphOutput;

      const deployTarget = await rpc.getDeployTarget();
      const { response, serialized } = await tgDeploy(reusableTgOutput, {
        typegate: {
          url: deployTarget.baseUrl,
          auth: new BasicAuth(
            deployTarget.auth.username,
            deployTarget.auth.password,
          ),
        },
        typegraphPath: env.typegraph_path,
        prefix: env.prefix,
        secrets: deployData.secrets,
        migrationsDir: this.#getMigrationsDir(),
        migrationActions: deployData.migrationActions,
        defaultMigrationAction: deployData.defaultMigrationAction,
      });

      log.success({
        typegraph: {
          name: this.#typegraph.name,
          path: env.typegraph_path,
          value: serialized,
        },
        ...response,
      });
    } catch (err) {
      log.failure({
        typegraph: this.#typegraph.name,
        errors: getErrorStack(err, "failed to deploy typegraph"),
      });
      return;
    }
  }

  #list() {
    log.success({ typegraph: this.#typegraph.name });
  }
}

// deno-lint-ignore no-explicit-any
function getErrorStack(err: any, defaultErr: string): string[] {
  if (err instanceof Error) {
    log.debug(err);
    return [err.message];
  }
  return err?.stack ?? [err?.toString() ?? defaultErr];
}
