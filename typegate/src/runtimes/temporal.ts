// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult } from "../utils.ts";
import { ComputeStage } from "../engine.ts";

export class TemporalRuntime extends Runtime {
  client_id: string;

  private constructor(client_id: string) {
    super();
    this.client_id = client_id;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraph, args } = params;
    const typegraphName = typegraph.types[0].title;

    const { client_id } = nativeResult(
      await native.temporal_register({
        url: args.host as string,
        namespace: "default",
        typegraph: typegraphName,
      }),
    );
    return new TemporalRuntime(client_id);
  }

  async deinit(): Promise<void> {
    const { client_id } = this;
    nativeResult(
      await native.temporal_unregister({
        client_id,
      }),
    );
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const name = stage.props.materializer?.name;
    const { workflow } = stage.props.materializer?.data ?? {};
    const { client_id } = this;

    const resolver: Resolver = (() => {
      if (name === "start_workflow") {
        return async ({ workflow_id, args }) => {
          const { run_id } = nativeResult(
            await native.temporal_workflow_start({
              client_id,
              args: args.map(JSON.stringify),
              workflow_id: workflow_id as string,
              workflow_type: workflow as string,
              task_queue: "default",
              request_id: null,
            }),
          );

          return run_id;
        };
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
