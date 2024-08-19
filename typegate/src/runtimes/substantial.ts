// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";

const logger = getLogger(import.meta);

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;

  private constructor(typegraphName: string) {
    super(typegraphName);
    this.logger = getLogger(`substantial:'${typegraphName}'`);
  }

  static init(params: RuntimeInitParams): Runtime {
    logger.info("initializing SubstantialRuntime");
    logger.debug(`init params: ${JSON.stringify(params)}`);
    const { typegraph, args: _args, secretManager: _secrets } = params;
    const typegraphName = TypeGraph.formatName(typegraph);

    const instance = new SubstantialRuntime(typegraphName);

    return instance;
  }

  async deinit(): Promise<void> {
    logger.info("deinitializing SubstantialRuntime");
    return await Promise.reject("not implemented");
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const name = stage.props.materializer?.name;
    const resolver: Resolver = (() => {
      const data = stage.props.materializer?.data ?? {};
      if (name === "start") {
        throw new Error(JSON.stringify(data));
      }

      if (name === "stop") {
        throw new Error(JSON.stringify(data));
      }

      if (name === "event") {
        throw new Error(JSON.stringify(data));
      }

      return () => null;
    })();

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }
}
