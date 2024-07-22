// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as native from "native";
import { Runtime } from "@typegate/runtimes/Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
// import { Redis } from "redis";
import { registerRuntime } from "@typegate/runtimes/mod.ts";
import { getLogger, Logger } from "@typegate/log.ts";
import { TypeGraph } from "@typegate/typegraph/mod.ts";
import { RuntimeInitParams } from "@typegate/types.ts";
import { kvRuntimeData } from "@typegate/typegraph/types.ts";
import { nativeVoid } from "@typegate/utils.ts";

const logger = getLogger(import.meta);

@registerRuntime("kv")
export class kvRuntime extends Runtime {
  private logger: Logger;

  private constructor(typegraphName: string) {
    super(typegraphName);
    this.logger = getLogger(`kv:'${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing kvRuntime");
    logger.debug(`init params:  ${JSON.stringify(params)}`);
    const { typegraph, args } = params as RuntimeInitParams<
      kvRuntimeData
    >;
    const typegraphName = TypeGraph.formatName(typegraph);

    const instance = new kvRuntime(typegraphName);
    instance.logger.info("registering kvRuntime");
    nativeVoid(
      await native.kv_register({
        endpoint: args.endpoint,
        db_number: args.db_number,
        password: args.password,
      }) as "Ok" | { Err: { message: string } },
    );
    instance.logger.info("registered kvRuntime");

    return instance;
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
