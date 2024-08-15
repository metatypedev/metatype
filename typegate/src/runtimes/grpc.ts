// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "@typegate/runtimes/Runtime.ts";
import * as native from "native";
import { ComputeStage } from "@typegate/engine/query_engine.ts";
import { RuntimeInitParams } from "@typegate/types.ts";
import { getLogger, Logger } from "@typegate/log.ts";
import { TypeGraph } from "@typegate/typegraph/mod.ts";
import { nativeVoid } from "@typegate/utils.ts";

const logger = getLogger(import.meta);

interface GrpcRuntimeData {
  url: string;
}

export class GrpcRuntime extends Runtime {
  private logger: Logger;

  private constructor(typegraphName: string) {
    super(typegraphName);
    this.logger = getLogger(`grpc: '${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("Initliazing GrpcRuntime");
    logger.debug(`Init params: ${JSON.stringify(params)}`);

    const { typegraph, args } = params as RuntimeInitParams<
      GrpcRuntimeData
    >;
    const typegraphName = TypeGraph.formatName(typegraph);
    const instance = new GrpcRuntime(typegraphName);
    instance.logger.info("registering GrpcRuntime");
    nativeVoid(
      await native.grpc_register({ url: args.url }),
    );
    throw new Error("Method not implemented.");
  }

  deinit(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  materialize(
    _stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]> {
    throw new Error("Method not implemented.");
  }
}
