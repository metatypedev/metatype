// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { SerializeParams } from "./gen/interfaces/metatype-typegraph-core.js";
import { BasicAuth, tgDeploy } from "./tg_deploy.js";
import { TgFinalizationResult, TypegraphOutput } from "./typegraph.js";
import { freezeTgOutput } from "./utils/func_utils.js";
import { log, rpc } from "./io.js";
import { CliEnv, getCliEnv } from "./envs/cli.js";
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
        await this.#serialize();
        break;
      case "deploy":
        await this.#deploy();
        break;
      case "list":
        await this.#list();
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

  async #serialize(): Promise<void> {
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
    } catch (err: any) {
      log.failure({
        typegraph: this.#typegraph.name,
        errors: getErrorStack(err, "failed to serialize typegraph"),
      });
    }
  }

  async #deploy(): Promise<void> {
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
    } catch (err: any) {
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

    try {
      const deployTarget = await rpc.getDeployTarget();
      const { response } = await tgDeploy(reusableTgOutput, {
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

      log.success({ typegraph: this.#typegraph.name, ...response });
    } catch (err: any) {
      log.failure({
        typegraph: this.#typegraph.name,
        errors: getErrorStack(err, "failed to deploy typegraph"),
      });
      return;
    }
  }
  async #list(): Promise<void> {
    log.success({ typegraph: this.#typegraph.name });
  }
}

function getErrorStack(err: any, defaultErr: string): string[] {
  if (err instanceof Error) {
    log.debug(err);
    return [err.message];
  }
  return err?.stack ?? [err?.toString() ?? defaultErr];
}
