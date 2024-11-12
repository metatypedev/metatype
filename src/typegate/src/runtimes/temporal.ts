// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult, nativeVoid } from "../utils.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import type { TemporalRuntimeData } from "../typegraph/types.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, type Logger } from "../log.ts";

const logger = getLogger(import.meta);

@registerRuntime("temporal")
export class TemporalRuntime extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
  ) {
    super(typegraphName);
    this.logger = getLogger(`temporal:'${typegraphName}'`);
  }

  static async init(
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    const { typegraph, args, secretManager } = params as RuntimeInitParams<
      TemporalRuntimeData
    >;
    const typegraphName = TypeGraph.formatName(typegraph);

    const instance = new TemporalRuntime(typegraphName);
    instance.logger.info("registering TemporalRuntime");
    nativeVoid(
      await native.temporal_register({
        url: secretManager.secretOrFail(
          args.host_secret as string,
        ),
        namespace: secretManager.secretOrNull(
          args.namespace_secret as string,
        ) ??
          "default",
        client_id: instance.id,
      }),
    );
    instance.logger.info("registered TemporalRuntime");

    return instance;
  }

  async deinit(): Promise<void> {
    logger.info("deinitializing TemporalRuntime");
    nativeVoid(
      await native.temporal_unregister({
        client_id: this.id,
      }),
    );
    logger.info("unregistered TemporalRuntime");
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
        return async ({ workflow_id, args, task_queue }) => {
          this.logger.info("workflow: start");
          const { run_id } = nativeResult(
            await native.temporal_workflow_start({
              client_id,
              args: args.map(JSON.stringify),
              workflow_id: workflow_id as string,
              workflow_type: workflow_type as string,
              task_queue: task_queue as string,
              request_id: null,
            }),
          );
          this.logger.info(`workflow started: ${run_id}`);

          return run_id;
        };
      }

      if (name === "signal_workflow") {
        const { signal_name } = stage.props.materializer?.data ?? {};
        return async ({ workflow_id, run_id, args }) => {
          this.logger.info("workflow signal");
          this.logger.debug(`workflow signal: ${JSON.stringify(args)}`);
          nativeVoid(
            await native.temporal_workflow_signal({
              client_id,
              args: args.map(JSON.stringify),
              workflow_id: workflow_id as string,
              run_id: run_id as string,
              signal_name: signal_name as string,
              request_id: null,
            }),
          );
          this.logger.info("workflow signal: success");
          return true;
        };
      }

      if (name === "query_workflow") {
        const { query_type } = stage.props.materializer?.data ?? {};

        return async ({ workflow_id, run_id, args }) => {
          this.logger.info("workflow query");
          this.logger.debug(`workflow query: ${JSON.stringify(args)}`);
          const { data } = nativeResult(
            await native.temporal_workflow_query({
              client_id,
              args: args.map(JSON.stringify),
              workflow_id: workflow_id as string,
              run_id: run_id as string,
              query_type: query_type as string,
            }),
          );

          this.logger.info("workflow query: success");
          this.logger.debug(`workflow query: result: ${JSON.stringify(data)}`);

          logger.debug(Deno.inspect({ data, args }));
          const out = JSON.parse(data[0]);
          return out;
        };
      }

      if (name === "describe_workflow") {
        return async ({ workflow_id, run_id }) => {
          this.logger.info("workflow describe");
          this.logger.debug(
            `workflow describe: workflow=${workflow_id}, run=${run_id}`,
          );
          const res = nativeResult(
            await native.temporal_workflow_describe({
              client_id,
              workflow_id: workflow_id as string,
              run_id: run_id as string,
            }),
          );
          this.logger.info("workflow describe: success");
          this.logger.info(`workflow describe: ${JSON.stringify(res)}`);

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
