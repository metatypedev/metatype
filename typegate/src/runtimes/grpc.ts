// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine.ts";
import * as native from "native";
import { nativeResult } from "../utils.ts";

export class GrpcRuntime extends Runtime {
  private constructor() {
    super();
  }

  static init(_params: RuntimeInitParams): Promise<Runtime> {
    return Promise.resolve(new GrpcRuntime());
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const { materializer, argumentTypes } = stage.props;
    const { proto_file, method, endpoint } = materializer?.data ?? {};
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    const inputArgs = Object.keys(argumentTypes ?? {});

    const resolver: Resolver = async (args) => {
      const computedArgs: Record<string, unknown> = {};

      for (const inputArg of inputArgs) {
        computedArgs[inputArg] = args[inputArg];
      }

      const { res } = nativeResult(
        await native.call_grpc_method({
          proto_file: proto_file as string,
          method: method as string,
          endpoint: endpoint as string,
          payload: JSON.stringify(computedArgs),
        }),
      );

      const json = JSON.parse(res);
      return json;
    };

    return [
      stage.withResolver(resolver),
      ...sameRuntime.map((runtime) => {
        return runtime.withResolver((args) => {
          const parentValue = args._.parent;
          const currentNode = runtime.props.node;

          return parentValue[currentNode];
        });
      }),
    ];
  }
}
