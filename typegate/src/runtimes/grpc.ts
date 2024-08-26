// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "@typegate/runtimes/Runtime.ts";
import * as native from "native";
import { ComputeStage } from "@typegate/engine/query_engine.ts";
import { getLogger, Logger } from "@typegate/log.ts";
import { TypeGraph } from "@typegate/typegraph/mod.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult, nativeVoid } from "@typegate/utils.ts";

const logger = getLogger(import.meta);

interface GrpcRuntimeData {
  protoFile: string;
  endpoint: string;
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

    const { typegraph, args } = params as RuntimeInitParams<GrpcRuntimeData>;
    const typegraphName = TypeGraph.formatName(typegraph);
    const instance = new GrpcRuntime(typegraphName);

    nativeVoid(
      await native.grpc_register({
        protoFile: args.protoFile,
        endpoint: args.endpoint,
        client_id: instance.id,
      }),
    );

    instance.logger.info("registering GrpcRuntime");

    return instance;
  }

  async deinit(): Promise<void> {
    nativeVoid(
      await native.grpc_unregister({ client_id: this.id }),
    );
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]> {
    const { method } = stage.props.materializer?.data ?? {};

    const resolver: Resolver = async (args) => {
      const { payload } = args;
      return nativeResult(
        await native.call_grpc_method({
          method: String(method),
          payload,
          client_id: this.id,
        }),
      );
    };

    return [new ComputeStage({ ...stage.props, resolver })];
  }
}
