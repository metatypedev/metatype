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
    const { client_id } = this;

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
