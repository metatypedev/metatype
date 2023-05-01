// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const { materializer, inpType } = stage.props;
    const { proto, method } = materializer?.data ?? {};
    const order = Object.keys(inpType?.properties ?? {});

    const resolver: Resolver = async (args) => {
      const transfert = order.map((k) => JSON.stringify(args[k]));

      const { res } = nativeResult(
        await native.call_grpc_method({
          proto: proto as string,
          method: method as string,
          args: transfert,
        }),
      );
      return JSON.parse(res);
    };

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }
}
