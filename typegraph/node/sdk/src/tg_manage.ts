// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { BasicAuth, tgDeploy } from "./tg_deploy.js";
import { TgFinalizationResult, TypegraphOutput } from "./typegraph.js";
import { getEnvVariable } from "./utils/func_utils.js";
import { freezeTgOutput } from "./utils/func_utils.js";
import { log } from "./log.js";

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
    auth?: { // field not required for serialize command
      username: string;
      password: string;
    };
  };
  prefix?: string;
  secrets: Record<string, string>;
  artifactsConfig: ArtifactResolutionConfig;
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
  #port: number;
  #typegraph: TypegraphOutput;
  #endpoint: string;
  #typegraphPath: string;

  static isRunFromCLI(): boolean {
    return !!getEnvVariable(PORT);
  }

  constructor(typegraph: TypegraphOutput, port?: number) {
    this.#typegraph = typegraph;
    this.#typegraphPath = getEnvVariable(SELF_PATH)!;
    if (port == undefined) {
      const envPort = parseInt(getEnvVariable(PORT)!);
      if (isNaN(envPort)) {
        throw new Error(
          `Environment variable ${PORT} is not a number or is undefined`,
        );
      }
      this.#port = envPort;
    } else {
      this.#port = port;
    }
    this.#endpoint = `http://localhost:${this.#port}`;
  }

  async run() {
    const { config, command } = await this.#requestCommands();
    switch (command) {
      case "serialize":
        await this.#serialize(config);
        break;
      case "deploy":
        await this.#deploy(config);
        break;
      default:
        throw new Error(`command ${command} from meta-cli not supported`);
    }
  }

  async #requestCommands(): Promise<CLIServerResponse> {
    const { data: config } = await this.#requestConfig();
    // console.error("SDK received config", config);
    const { data: command } =
      await (await fetch(new URL("command", this.#endpoint)))
        .json() as CLISuccess<Command>;
    // console.error("SDK received command", command);

    return { command, config };
  }

  async #requestConfig(): Promise<CLISuccess<CLIConfigRequest>> {
    const params = new URLSearchParams({
      typegraph: this.#typegraph.name,
      typegraph_path: this.#typegraphPath,
    });
    const response = await fetch(new URL("config?" + params, this.#endpoint));
    return (await response.json()) as CLISuccess<CLIConfigRequest>;
  }

  async #serialize(config: CLIConfigRequest): Promise<void> {
    let finalizationResult: TgFinalizationResult;
    try {
      finalizationResult = this.#typegraph.serialize({
        ...config.artifactsConfig,
        prefix: config.prefix,
      });
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
    await this.#relayResultToCLI(
      "serialize",
      JSON.parse(finalizationResult.tgJson),
    );
  }

  async #deploy(
    { typegate, artifactsConfig, secrets, prefix }: CLIConfigRequest,
  ): Promise<void> {
    const { endpoint, auth } = typegate;
    if (!auth) {
      throw new Error(
        `"${this.#typegraph.name}" received null or undefined "auth" field on the configuration`,
      );
    }
    const config = {
      ...artifactsConfig,
      prefix,
    };

    // hack for allowing tg.serialize(config) to be called more than once
    const frozenOut = freezeTgOutput(config, this.#typegraph);

    // hack for allowing tg.serialize(config) to be called more than once
    let frozenSerialized: TgFinalizationResult;
    try {
      frozenSerialized = frozenOut.serialize(config);
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

    if (artifactsConfig.codegen) {
      await this.#relayResultToCLI(
        "codegen",
        JSON.parse(frozenSerialized.tgJson),
      );
    }

    try {
      const { response } = await tgDeploy(reusableTgOutput, {
        baseUrl: endpoint,
        artifactsConfig: config,
        secrets,
        auth: new BasicAuth(auth.username, auth.password),
        typegraphPath: this.#typegraphPath,
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

  async #relayResultToCLI<T>(initiator: Command, data: T) {
    const typegraphName = this.#typegraph.name;
    const response: SDKResponse<T> = {
      command: initiator,
      typegraphName,
      typegraphPath: this.#typegraphPath,
      data,
    };
    await fetch(new URL("response", this.#endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
  }

  async #relayErrorToCLI(
    initiator: Command,
    code: string,
    msg: string,
    value: string | any,
  ) {
    const typegraphName = this.#typegraph.name;
    const response: SDKResponse<any> = {
      command: initiator,
      typegraphName,
      typegraphPath: this.#typegraphPath,
      error: {
        code,
        msg,
        value,
      },
    };
    await fetch(new URL("response", this.#endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
  }
}
