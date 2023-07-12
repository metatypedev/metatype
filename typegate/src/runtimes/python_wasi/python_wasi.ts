// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";
import { Runtime } from "../Runtime.ts";
import { RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine.ts";
import { PythonWasmMessenger } from "./python_wasm_messenger.ts";

const _logger = getLogger(import.meta);

export class PythonWasiRuntime extends Runtime {
  private constructor(
    private w: PythonWasmMessenger,
    private fnNames: string[],
  ) {
    super();
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { materializers, typegraph } = params;
    const w = await PythonWasmMessenger.init();

    const fnNames = [];

    // TODO:
    // change tmp to custom script folder
    await w.vm.setup(typegraph.types[0].title, "tmp");

    for (const m of materializers) {
      switch (m.name) {
        case "lambda":
          await w.vm.registerLambda(m.data.name as string, m.data.fn as string);
          break;
        case "def":
          await w.vm.registerDef(m.data.name as string, m.data.fn as string);
          break;
          // TODO:
          // case "module":
          // await w.vm.registerModule(
          //   m.data.name as string,
          //   m.data.code as string,
          // );
          // break;
        default:
          throw new Error(`materializer name "${m.name}" not supported`);
      }
      fnNames.push(m.data.name as string);
    }

    return new PythonWasiRuntime(
      w,
      fnNames,
    );
  }

  async deinit(): Promise<void> {
    await this.w.vm.destroy();
    await this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const { name } = stage.props.materializer?.data ?? {};
    return [
      stage.withResolver((args) => this.w.execute(name as string, args)),
    ];
  }
}
