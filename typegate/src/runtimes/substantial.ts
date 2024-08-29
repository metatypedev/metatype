// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";
import * as native from "native";
import { nativeResult } from "../utils.ts";

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
    logger.debug(`init args: ${JSON.stringify(params.args)}`);
    const { typegraph, args: _args, secretManager: _secrets } = params;
    const typegraphName = TypeGraph.formatName(typegraph);

    const instance = new SubstantialRuntime(typegraphName);

    return instance;
  }

  async deinit(): Promise<void> {
    logger.info("deinitializing SubstantialRuntime");
    return await Promise.resolve();
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
        const { run } = nativeResult(
          native.createOrGetRun({
            run_id: "one",
            backend: "Memory",
          }),
        );

        if (run.operations.length == 0) {
          run.operations = [
            {
              Start: {
                kwargs: {},
              },
            },
            {
              Save: {
                id: 1,
                value: 11,
              },
            },
            {
              Save: {
                id: 2,
                value: 22,
              },
            },
          ];
          console.log("Init");
        } else {
          console.log("Recovered from backend");
        }

        console.log(
          nativeResult(
            native.persistRun({
              backend: "Memory",
              run,
            }),
          ),
        );

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
