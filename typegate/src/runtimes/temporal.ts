// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult, nativeVoid } from "../utils.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { TemporalRuntimeData } from "../typegraph/types.ts";
import { registerRuntime } from "./mod.ts";

@registerRuntime("temporal")
export class TemporalRuntime extends Runtime {
  private constructor(
    typegraphName: string,
  ) {
    super(typegraphName);
  }

  static async init(
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    const { typegraph, args } = params as RuntimeInitParams<
      TemporalRuntimeData
    >;
    const typegraphName = TypeGraph.formatName(typegraph);

    const instance = new TemporalRuntime(typegraphName);
    nativeVoid(
      await native.temporal_register({
        url: args.host as string,
        namespace: "default",
        client_id: instance.id,
      }),
    );
    return instance;
  }

  async deinit(): Promise<void> {
    nativeVoid(
      await native.temporal_unregister({
        client_id: this.id,
      }),
    );
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const name = stage.props.materializer?.name;
    const client_id = this.id;

    const resolver: Resolver = (() => {
      if (name === "start_workflow") {
        const { workflow_type } = stage.props.materializer?.data ?? {};
        return async ({ workflow_id, args }) => {
          const { run_id } = nativeResult(
            await native.temporal_workflow_start({
              client_id,
              args: args.map(JSON.stringify),
              workflow_id: workflow_id as string,
              workflow_type: workflow_type as string,
              task_queue: "default",
              request_id: null,
            }),
          );

          return run_id;
        };
      }

      if (name === "signal_workflow") {
        const { signal_name } = stage.props.materializer?.data ?? {};
        return async ({ workflow_id, run_id, args }) => {
          await native.temporal_workflow_signal({
            client_id,
            args: args.map(JSON.stringify),
            workflow_id: workflow_id as string,
            run_id: run_id as string,
            signal_name: signal_name as string,
            request_id: null,
          });

          return true;
        };
      }

      if (name === "query_workflow") {
        const { query_type } = stage.props.materializer?.data ?? {};

        return async ({ workflow_id, run_id, args }) => {
          const { data } = nativeResult(
            await native.temporal_workflow_query({
              client_id,
              args: args.map(JSON.stringify),
              workflow_id: workflow_id as string,
              run_id: run_id as string,
              query_type: query_type as string,
            }),
          );

          return data;
        };
      }

      if (name === "describe_workflow") {
        return async ({ workflow_id, run_id }) => {
          const res = nativeResult(
            await native.temporal_workflow_describe({
              client_id,
              workflow_id: workflow_id as string,
              run_id: run_id as string,
            }),
          );

          return res;
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
