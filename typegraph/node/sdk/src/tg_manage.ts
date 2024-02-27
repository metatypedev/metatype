// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { BasicAuth, tgRemove } from "./tg_deploy.js";
import { TypegraphOutput } from "./typegraph.js";
import { getEnvVariable } from "./utils/func_utils.js";

const VERSION = "0.3.5-0";
const PORT_SOURCE = "META_CLI_SERVER_PORT";

type Command = "serialize" | "deploy" | "unpack_migration";

// Types for CLI => SDK
type CLIServerResponse = {
  command: Command;
  config: CLIConfigRequest;
};

type CLIConfigRequest = {
  typegate: {
    endpoint: string;
    auth?: {
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

// Types for SDK => CLi (typically forwarding the response from typegate)
type SDKResponse<T> = {
  command: Command;
  typegraphName: string;
} & ({ error: T } | { data: T });

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
      case "unpack_migration":
        this.#unpackMigration(config);
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

  #serialize(config: CLIConfigRequest): void {
    const ret = this.#typegraph.serialize(config.artifactsConfig);
    console.log(ret);
  }

  async #deploy({ typegate }: CLIConfigRequest): Promise<void> {
    const { endpoint, auth } = typegate;
    if (!auth) {
      throw new Error(
        `"${this.#typegraph.name}" received null or undefined "auth" field on the configuration`,
      );
    }
    await this.#relayResultToCLI(
      "deploy",
      async () =>
        await tgRemove(this.#typegraph, {
          baseUrl: endpoint,
          auth: new BasicAuth(auth.username, auth.password),
        }),
    );
  }

  #unpackMigration(config: CLIConfigRequest): void {
    // TODO
  }

  async #relayResultToCLI<T>(initiator: Command, fn: () => Promise<T>) {
    const typegraphName = this.#typegraph.name;
    let response: SDKResponse<any>;
    try {
      const data = await fn();
      response = { command: initiator, typegraphName, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : err;
      response = { command: initiator, typegraphName, error: msg };
    }

    await fetch(new URL("response", this.#endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
  }
}
