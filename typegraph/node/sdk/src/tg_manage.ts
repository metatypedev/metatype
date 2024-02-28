// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { BasicAuth, tgDeploy, tgRemove } from "./tg_deploy.js";
import { TypegraphOutput } from "./typegraph.js";
import { getEnvVariable } from "./utils/func_utils.js";

const VERSION = "0.3.5-0";
const PORT = "META_CLI_SERVER_PORT"; // meta-cli instance that executes the current file
const SELF_PATH = "META_CLI_TG_PATH"; // path to the current file to uniquely identify the run results

type Command = "serialize" | "deploy" | "unpack_migration";

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
  secrets: Record<string, string>;
  artifactsConfig: ArtifactResolutionConfig;
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
    let { config, command } = await this.#requestCommands();
    switch (command) {
      case "serialize":
        await this.#serialize(config);
        break;
      case "deploy":
        await this.#deploy(config);
        break;
      case "unpack_migration":
        await this.#unpackMigration(config);
        break;
      default:
        throw new Error(`command ${command} from meta-cli not supported`);
    }
  }

  async #requestCommands(): Promise<CLIServerResponse> {
    const { data: config } = await this.#requestConfig();
    console.error("CONFIG", config);
    const { data: command } =
      await (await fetch(new URL("command", this.#endpoint)))
        .json() as CLISuccess<Command>;

    console.error("Command", command);

    return { command, config };
  }

  async #requestConfig(): Promise<CLISuccess<CLIConfigRequest>> {
    const params = new URLSearchParams({
      typegraph: this.#typegraph.name,
    });
    const response = await fetch(new URL("config?" + params, this.#endpoint));
    return (await response.json()) as CLISuccess<CLIConfigRequest>;
  }

  async #serialize(config: CLIConfigRequest): Promise<void> {
    await this.#relayResultToCLI(
      "serialize",
      async () => this.#typegraph.serialize(config.artifactsConfig),
    );
  }

  async #deploy(
    { typegate, artifactsConfig, secrets }: CLIConfigRequest,
  ): Promise<void> {
    const { endpoint, auth } = typegate;
    if (!auth) {
      throw new Error(
        `"${this.#typegraph.name}" received null or undefined "auth" field on the configuration`,
      );
    }
    await this.#relayResultToCLI(
      "deploy",
      async () => {
        const { typegate } = await tgDeploy(this.#typegraph, {
          baseUrl: endpoint,
          artifactsConfig,
          cliVersion: VERSION,
          secrets,
          auth: new BasicAuth(auth.username, auth.password),
        });
        return typegate;
      },
    );
  }

  async #unpackMigration(config: CLIConfigRequest): Promise<void> {
    // TODO
  }

  async #relayResultToCLI<T>(initiator: Command, fn: () => Promise<T>) {
    const typegraphName = this.#typegraph.name;
    let response: SDKResponse<any>;
    const common = {
      command: initiator,
      typegraphName,
      typegraphPath: this.#typegraphPath,
    };
    try {
      const data = await fn();
      response = { ...common, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : err;
      response = { ...common, error: msg };
    }

    await fetch(new URL("response", this.#endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
  }
}
