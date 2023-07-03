// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage, Engine } from "../engine.ts";
import { Register } from "../register.ts";
import { Resolver } from "../types.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { SecretManager, TypeGraph } from "../typegraph.ts";
import { getLogger } from "../log.ts";
import config from "../config.ts";
import * as semver from "std/semver/mod.ts";
import { handleOnPushHooks, PushResponse } from "../hooks.ts";

const logger = getLogger(import.meta);

export class TypeGateRuntime extends Runtime {
  static singleton: TypeGateRuntime | null = null;

  private constructor(private register: Register) {
    super();
  }

  static init(register: Register): TypeGateRuntime {
    if (!TypeGateRuntime.singleton) {
      TypeGateRuntime.singleton = new TypeGateRuntime(register);
    }
    return TypeGateRuntime.singleton;
  }

  deinit(): Promise<void> {
    TypeGateRuntime.singleton = null;
    return Promise.resolve();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const resolver: Resolver = (() => {
      const name = stage.props.materializer?.name;
      if (name === "addTypegraph") {
        return this.addTypegraph;
      }
      if (name === "removeTypegraph") {
        return this.removeTypegraph;
      }
      if (name === "typegraphs") {
        return this.typegraphs;
      }
      if (name === "typegraph") {
        return this.typegraph;
      }
      if (name === "serializedTypegraph") {
        return this.serializedTypegraph;
      }

      return async ({ _: { parent }, ...args }) => {
        const resolver = parent[stage.props.node];
        const ret = typeof resolver === "function"
          ? await resolver(args)
          : resolver;
        return ret;
      };
    })();

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  typegraphs: Resolver = ({ _: { info: { url } } }) => {
    return this.register.list().map((e) => {
      return {
        name: e.name,
        url: () => `${url.protocol}//${url.host}/${e.name}`,
      };
    });
  };

  typegraph: Resolver = ({ name, _: { info: { url } } }) => {
    const tg = this.register.get(name);
    if (!tg) {
      return null;
    }
    return {
      name: tg.name,
      url: `${url.protocol}//${url.host}/${tg.name}`,
    };
  };

  serializedTypegraph: Resolver = (
    { _: { parent: typegraph } },
  ) => {
    const tg = this.register.get(typegraph.name as string);
    if (!tg) {
      return null;
    }

    return JSON.stringify(tg.tg.tg);
  };

  addTypegraph: Resolver = async ({ fromString, secrets, cliVersion }) => {
    logger.info("Adding typegraph");
    if (!semver.gte(semver.parse(cliVersion), semver.parse(config.version))) {
      throw new Error(
        `Meta CLI version ${cliVersion} must be greater than typegate version ${config.version} (until the releases are stable)`,
      );
    }

    const [engine, pushResponse] = await pushTypegraph(
      fromString,
      JSON.parse(secrets),
      this.register,
      true, // introspection
    );

    return {
      name: engine.name,
      messages: pushResponse.messages,
      migrations: pushResponse.migrations,
      resetRequired: pushResponse.resetRequired,
    };
  };

  removeTypegraph: Resolver = ({ name }) => {
    if (SystemTypegraph.check(name)) {
      throw new Error(`Typegraph ${name} cannot be removed`);
    }

    return this.register.remove(name);
  };
}

export async function pushTypegraph(
  tgJson: string,
  secrets: Record<string, string>,
  register: Register,
  introspection: boolean,
  system = false,
): Promise<[Engine, PushResponse]> {
  const tgDS = await TypeGraph.parseJson(tgJson);
  const name = TypeGraph.formatName(tgDS);

  if (SystemTypegraph.check(name)) {
    if (!system) {
      throw new Error(
        `Typegraph name ${name} cannot be used for non-system typegraphs`,
      );
    }
  } else {
    if (system) {
      throw new Error(
        `Typegraph name ${name} cannot be used for system typegraphs`,
      );
    }
  }

  // name without prefix!
  const secretManager = new SecretManager(tgDS.types[0].title, secrets);

  const pushResponse = new PushResponse(name);
  logger.info("Handling onPush hooks");
  const tg = await handleOnPushHooks(
    tgDS,
    secretManager,
    pushResponse,
  );

  logger.info(`Initializing engine '${name}'`);
  const engine = await Engine.init(
    tg,
    secretManager,
    false,
    SystemTypegraph.getCustomRuntimes(register),
    introspection ? undefined : null,
  );

  logger.info(`Registering engine '${name}'`);
  await register.add(engine);

  return [engine, pushResponse];
}
