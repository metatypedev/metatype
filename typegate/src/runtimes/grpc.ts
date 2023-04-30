// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine.ts";

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
    const resolver: Resolver = (args) => {
      return `Hello ${args.name}`;
    };

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }
}
