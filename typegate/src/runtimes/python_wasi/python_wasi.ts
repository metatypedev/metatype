// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { getLogger } from "../../log.ts";
import { Runtime } from "../Runtime.ts";
import { RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine.ts";
import { PythonWasmMessenger } from "./python_wasm_messenger.ts";

const logger = getLogger(import.meta);

export class PythonWasiRuntime extends Runtime {
  private constructor(
    private w: PythonWasmMessenger,
    private fnNames: string[],
  ) {
    super();
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { materializers } = params;
    const w = await PythonWasmMessenger.init();

    const fnNames = [];

    for (const m of materializers) {
      fnNames.push(m.data.name as string);
      const register = await w.executeSync("register", m.data.name, m.data.fn);
      if (register.error) {
        throw new Error(register.error);
      }
    }

    return new PythonWasiRuntime(
      w,
      fnNames,
    );
  }

  async deinit(): Promise<void> {
    for (const name of this.fnNames) {
      const unregister = await this.w.executeSync("unregister", name);
      if (unregister.error) {
        logger.error(unregister.error);
      }
    }
    await this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const { name } = stage.props.materializer?.data ?? {};
    return [
      stage.withResolver((args) =>
        this.w.execute(name as string, JSON.stringify(args)).then((x) =>
          JSON.parse(x as string)
        )
      ),
    ];
  }
}
