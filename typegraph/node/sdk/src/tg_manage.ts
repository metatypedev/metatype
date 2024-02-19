// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { TypegraphOutput } from "./typegraph.js";
import { getEnvVariable } from "./utils/func_utils.js";

const VERSION = "0.3.5-0";
const PORT_SOURCE = "META_CLI_SERVER_PORT";

type Command = "serialize" | "deploy" | "undeploy" | "unpack_migration";
type CLIServerResponse = {
  command: Command;
  config: ArtifactResolutionConfig;
};

type SDKResponse = {
  name: string;
  message: string;
  typegate?: unknown;
};

export class Manager {
  #port: number;
  #typegraph: TypegraphOutput;
  #endpoint: string;

  static isRunFromCLI(): boolean {
    const value = getEnvVariable(PORT_SOURCE);
    if (value && value.toLowerCase() == "true") {
      return true;
    }
    return false;
  }

  constructor(typegraph: TypegraphOutput, port?: number) {
    this.#typegraph = typegraph;
    if (port == undefined) {
      const envPort = parseInt(getEnvVariable(PORT_SOURCE)!);
      if (isNaN(envPort)) {
        throw new Error(
          `Environment variable ${PORT_SOURCE} is not a number or is undefined`,
        );
      }
      this.#port = envPort;
    } else {
      this.#port = port;
    }
    this.#endpoint = `http://localhost:${this.#port}`;
  }

  async run() {
    let { config, command } = await this.#requestCommands();
    switch (command) {
      case "serialize":
        this.#serialize(config);
      case "deploy":
        this.#deploy(config);
      case "undeploy":
        this.#undeploy();
      case "unpack_migration":
        this.#unpackMigration(config);
      default:
        throw new Error(`command ${command} from meta-cli not supported`);
    }
  }

  async #requestCommands(): Promise<CLIServerResponse> {
    // 1. GET localhost:port/config?tg_name=..
    const config = await this.#requestConfiguration();
    // 2. GET localhost:port/command?tg_name=..
    return { command: "deploy", config };
  }

  async #sendStatusToCLI(response: SDKResponse) {
    const url = new URL("status", this.#endpoint);
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    });
  }

  async #requestConfiguration(): Promise<ArtifactResolutionConfig> {
    const url = new URL("config", this.#endpoint);
    const response = await fetch(url);
    // TODO:
    // configuration follows a different structure on CLI
    // a converter is needed there and
    return (await response.json()) as ArtifactResolutionConfig;
  }

  #serialize(config: ArtifactResolutionConfig): void {
    // TODO
  }

  #deploy(config: ArtifactResolutionConfig): void {
    // TODO
  }

  #undeploy(): void {
    // TODO
  }

  #unpackMigration(config: ArtifactResolutionConfig): void {
    // TODO
  }
}
