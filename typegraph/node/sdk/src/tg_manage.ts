// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { FinalizeParams } from "./gen/interfaces/metatype-typegraph-core.js";
import { BasicAuth, tgDeploy } from "./tg_deploy.js";
import { TgFinalizationResult, TypegraphOutput } from "./typegraph.js";
import { getEnvVariable } from "./utils/func_utils.js";
import { freezeTgOutput } from "./utils/func_utils.js";
import { GlobalConfig, log, rpc, TypegraphConfig } from "./io.js";

const PORT = "MCLI_SERVER_PORT"; // meta-cli instance that executes the current file
const SELF_PATH = "MCLI_TG_PATH"; // path to the current file to uniquely identify the run results

type Command = "serialize" | "deploy" | "codegen";

// Types for CLI => SDK
type CLIServerResponse = {
  command: Command;
  config: CLIConfigRequest;
};

type CLIConfigRequest = {
  typegate: {
    endpoint: string;
    auth?: {
      // field not required for serialize command
      username: string;
      password: string;
    };
  };
  prefix?: string;
  secrets: Record<string, string>;
  artifactsConfig: FinalizeParams;
  disableArtifactResolution: boolean;
  codegen: boolean;
};

type CLISuccess<T> = {
  data: T;
};

// Types for SDK => CLI (typically forwarding the response from typegate)
type SDKResponse<T> = {
  command: Command;
  typegraphName: string;
  typegraphPath: string;
} & ({ error: T } | { data: T });

export class Manager {
  #typegraph: TypegraphOutput;
  #typegraphPath: string;

  static #globalConfig: GlobalConfig | null = null;
  static async getGlobalConfig(): Promise<GlobalConfig> {
    if (Manager.#globalConfig == null) {
      Manager.#globalConfig = await rpc.getGlobalConfig();
    }
    return Manager.#globalConfig;
  }

  static #command: Command | null = null;
  static getCommand(): Command {
    if (Manager.#command == null) {
      Manager.#command = getEnvVariable("MCLI_ACTION") as Command;
    }
    return Manager.#command;
  }

  static isRunFromCLI(): boolean {
    return !!getEnvVariable(PORT);
  }

  public static async init(typegraph: TypegraphOutput) {
    const globalConfig = await Manager.getGlobalConfig();
    const typegraphConfig = await rpc.getTypegraphConfig(typegraph.name);
    return new Manager(typegraph, globalConfig, typegraphConfig);
  }

  private constructor(
    typegraph: TypegraphOutput,
    private globalConfig: GlobalConfig,
    private typegraphConfig: TypegraphConfig,
  ) {
    this.#typegraph = typegraph;
    this.#typegraphPath = getEnvVariable(SELF_PATH)!;
  }

  async run() {
    const command = Manager.getCommand();

    const finalizeParams = {
      typegraphPath: this.#typegraphPath,
      prefix: this.globalConfig.prefix ?? undefined,
      artifactResolution: true,
      codegen: false,
      prismaMigration: {
        migrationsDir: this.typegraphConfig.migrationsDir,
        migrationActions: Object.entries(this.typegraphConfig.migrationActions),
        defaultMigrationAction: this.typegraphConfig.defaultMigrationAction,
      },
    } as FinalizeParams;

    switch (command) {
      case "serialize":
        await this.#serialize(finalizeParams);
        break;
      case "deploy":
        await this.#deploy(finalizeParams);
        break;
      default:
        throw new Error(`command ${command} from meta-cli not supported`);
    }
  }

  // async #requestCommands(): Promise<CLIServerResponse> {
  //   const { data: config } = await this.#requestConfig();
  //   // console.error("SDK received config", config);
  //   const { data: command } =
  //     await (await fetch(new URL("command", this.#endpoint)))
  //       .json() as CLISuccess<Command>;
  //   // console.error("SDK received command", command);
  //
  //   return { command, config };
  // }
  //
  // async #requestConfig(): Promise<CLISuccess<CLIConfigRequest>> {
  //   const params = new URLSearchParams({
  //     typegraph: this.#typegraph.name,
  //     typegraph_path: this.#typegraphPath,
  //   });
  //   const response = await fetch(new URL("config?" + params, this.#endpoint));
  //   return (await response.json()) as CLISuccess<CLIConfigRequest>;
  // }

  async #serialize(config: FinalizeParams): Promise<void> {
    let finalizationResult: TgFinalizationResult;
    try {
      finalizationResult = this.#typegraph.serialize(config);
    } catch (err: any) {
      log.failure({
        typegraph: this.#typegraph.name,
        error: err?.message ?? "failed to serialize typegraph",
      });
      return;
      // return await this.#relayErrorToCLI(
      //   "serialize",
      //   "serialization_err",
      //   err?.message ?? "error serializing typegraph",
      //   {
      //     err,
      //   },
      // );
    }

    log.success(finalizationResult.tgJson, true);
    // await this.#relayResultToCLI(
    //   "serialize",
    //   JSON.parse(finalizationResult.tgJson),
    // );
  }

  async #deploy(finalizeParams: FinalizeParams): Promise<void> {
    const { endpoint, auth } = this.globalConfig.typegate!;
    if (!auth) {
      throw new Error(
        `"${this.#typegraph.name}" received null or undefined "auth" field on the configuration`,
      );
    }

    // hack for allowing tg.serialize(config) to be called more than once
    const frozenOut = freezeTgOutput(finalizeParams, this.#typegraph);

    // hack for allowing tg.serialize(config) to be called more than once
    let frozenSerialized: TgFinalizationResult;
    try {
      frozenSerialized = frozenOut.serialize(finalizeParams);
    } catch (err: any) {
      log.failure({
        typegraph: this.#typegraph.name,
        error: err?.message ?? "failed to serialize typegraph",
      });
      return;
      // return await this.#relayErrorToCLI(
      //   "deploy",
      //   "serialization_err",
      //   err?.message ?? "error serializing typegraph",
      //   {
      //     err,
      //   },
      // );
    }
    const reusableTgOutput = {
      ...this.#typegraph,
      serialize: () => frozenSerialized,
    } as TypegraphOutput;

    if (finalizeParams.codegen) {
      // TODO
      throw new Error("not implemented");
      // await this.#relayResultToCLI(
      //   "codegen",
      //   JSON.parse(frozenSerialized.tgJson),
      // );
    }

    try {
      const { response } = await tgDeploy(reusableTgOutput, {
        typegate: {
          url: endpoint,
          auth: new BasicAuth(auth.username, auth.password),
        },
        typegraphPath: this.#typegraphPath,
        prefix: finalizeParams.prefix,
        secrets: this.typegraphConfig.secrets,
        migrationsDir: this.typegraphConfig.migrationsDir,
        migrationActions: this.typegraphConfig.migrationActions,
        defaultMigrationAction: this.typegraphConfig.defaultMigrationAction,
      });

      log.success({ typegraph: this.#typegraph.name, ...response });
    } catch (err: any) {
      log.failure({
        typegraph: this.#typegraph.name,
        error: err?.message ?? "failed to deploy typegraph",
      });
      return;
    }
  }

  // async #relayResultToCLI<T>(initiator: Command, data: T) {
  //   const typegraphName = this.#typegraph.name;
  //   const response: SDKResponse<T> = {
  //     command: initiator,
  //     typegraphName,
  //     typegraphPath: this.#typegraphPath,
  //     data,
  //   };
  //   await fetch(new URL("response", this.#endpoint), {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(response),
  //   });
  // }

  // async #relayErrorToCLI(
  //   initiator: Command,
  //   code: string,
  //   msg: string,
  //   value: string | any,
  // ) {
  //   const typegraphName = this.#typegraph.name;
  //   const response: SDKResponse<any> = {
  //     command: initiator,
  //     typegraphName,
  //     typegraphPath: this.#typegraphPath,
  //     error: {
  //       code,
  //       msg,
  //       value,
  //     },
  //   };
  //   await fetch(new URL("response", this.#endpoint), {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(response),
  //   });
  // }
}
