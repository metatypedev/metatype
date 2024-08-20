// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "@typegate/runtimes/Runtime.ts";
import * as native from "native";
import { ComputeStage } from "@typegate/engine/query_engine.ts";
import { getLogger, Logger } from "@typegate/log.ts";
import { TypeGraph } from "@typegate/typegraph/mod.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";

const logger = getLogger(import.meta);

export class GrpcRuntime extends Runtime {
  private logger: Logger;

  private constructor(typegraphName: string) {
    super(typegraphName);
    this.logger = getLogger(`grpc: '${typegraphName}'`);
  }

  // deno-lint-ignore require-await
  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("Initliazing GrpcRuntime");
    logger.debug(`Init params: ${JSON.stringify(params)}`);

    const { typegraph } = params as RuntimeInitParams;
    const typegraphName = TypeGraph.formatName(typegraph);
    const instance = new GrpcRuntime(typegraphName);
    instance.logger.info("registering GrpcRuntime");
    return instance;
  }

  deinit(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]> {
    const resolver: Resolver = async (args) => {
      const { proto_file, method, payload, endpoint } = args;
      return await native.call_grpc_method({
        proto_file,
        method,
        payload,
        endpoint,
      });
    };

    return [new ComputeStage({ ...stage.props, resolver })];
  }
}
