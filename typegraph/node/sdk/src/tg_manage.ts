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
  config: CLIConfigRequest;
};

type CLIConfigRequest = {
  typegates: Record<string, string>;
  secrets: Record<string, string>;
  artifactsConfig: ArtifactResolutionConfig;
};

type SDKSuccess<T> = {
  data: T;
};

export class Manager {
  #port: number;
  #typegraph: TypegraphOutput;
  #endpoint: string;

  static isRunFromCLI(): boolean {
    return !!getEnvVariable(PORT_SOURCE);
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
        break;
      case "deploy":
        this.#deploy(config);
        break;
      case "undeploy":
        this.#undeploy();
      case "unpack_migration":
        this.#unpackMigration(config);
        break;
      default:
        throw new Error(`command ${command} from meta-cli not supported`);
    }
  }

  async #requestCommands(): Promise<CLIServerResponse> {
    const { data: config } = await this.#requestConfig();

    const { data: command } =
      await (await fetch(new URL("command", this.#endpoint)))
        .json() as SDKSuccess<Command>;

    console.error("Command", command);

    return { command, config };
  }

  async #requestConfig(): Promise<SDKSuccess<CLIConfigRequest>> {
    const response = await fetch(new URL("config", this.#endpoint));
    return (await response.json()) as SDKSuccess<CLIConfigRequest>;
  }

  #serialize(config: CLIConfigRequest): void {
    const ret = this.#typegraph.serialize(config.artifactsConfig);
    // TODO:
    // send back through http
    console.log(ret);
  }

  #deploy(config: CLIConfigRequest): void {
    // TODO
  }

  #undeploy(): void {
    // TODO
  }

  #unpackMigration(config: CLIConfigRequest): void {
    // TODO
  }
}
