// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { ComputeStage } from "../engine/query_engine.ts";
import { getLogger, Logger } from "../log.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult, nativeVoid } from "../utils.ts";
import { registerRuntime } from "./mod.ts";

const logger = getLogger(import.meta);

interface GrpcRuntimeData {
  proto_file_content: string;
  endpoint: string;
}

@registerRuntime("grpc")
export class GrpcRuntime extends Runtime {
  private logger: Logger;

  private constructor(typegraphName: string) {
    super(typegraphName);
    this.logger = getLogger(`grpc: '${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("Initliazing GrpcRuntime");

    const { typegraph, args } = params as RuntimeInitParams<GrpcRuntimeData>;
    const typegraphName = TypeGraph.formatName(typegraph);
    const instance = new GrpcRuntime(typegraphName);

    nativeVoid(
      await native.grpc_register({
        proto_file_content: args.proto_file_content,
        endpoint: args.endpoint,
        client_id: instance.id,
      }),
    );

    instance.logger.info("registering GrpcRuntime");

    return instance;
  }

  async deinit(): Promise<void> {
    nativeVoid(await native.grpc_unregister({ client_id: this.id }));
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]> {
    if (stage.props.materializer == null) {
      return [
        stage.withResolver(({ _: { parent } }) => {
          const resolver = parent[stage.props.node];
          return typeof resolver === "function" ? resolver() : resolver;
        }),
      ];
    }

    const { method } = stage.props.materializer?.data ?? {};

    const resolver: Resolver = async (args) => {
      const { _, ...payload } = args;
      return JSON.parse(
        nativeResult(
          await native.call_grpc_method({
            method: String(method),
            payload: JSON.stringify(payload),
            client_id: this.id,
          }),
        ),
      );
    };

    return [new ComputeStage({ ...stage.props, resolver })];
  }
}
