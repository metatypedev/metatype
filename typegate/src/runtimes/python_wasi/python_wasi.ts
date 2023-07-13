// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";
import { Runtime } from "../Runtime.ts";
import { RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine.ts";
import { PythonWasmMessenger } from "./python_wasm_messenger.ts";
import { path } from "compress/deps.ts";
import { TypeGraph } from "../../typegraph.ts";

const logger = getLogger(import.meta);

export class PythonWasiRuntime extends Runtime {
  private constructor(
    private w: PythonWasmMessenger,
  ) {
    super();
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { materializers, typegraph } = params;
    const w = await PythonWasmMessenger.init();

    const typegraphName = TypeGraph.formatName(typegraph);

    // TODO:
    // change tmp to config.tmp_dir
    // customize
    // const basePath = path.join(
    //   "tmp",
    //   "scripts",
    //   typegraphName,
    //   "python",
    // );

    // TODO:
    // customize path per entry point per vm(worker?) per repr.hash
    logger.info(`initializing python vm: ${typegraphName}`);
    await w.vm.setup(typegraphName, "tmp");

    const mods = materializers
      .filter((m) => m.name == "import_function")
      .map((m) => {
        const modMat = typegraph.materializers[m.data.mod as number];
        const code = modMat.data.code as string;
        const file = modMat.data.file as string;
        const modName = path.parse(file).name;

        // TODO: move this logic to postprocess or python runtime
        m.data.name = `${modName}.${m.data.name as string}`;

        return { modName, file, code };
      });

    for (const imp of mods) {
      console.info("[!] module", imp);
      // TODO:
      // Can we bind multiple paths ?
      // - /app => [dir1, dir2, ... ]
      // - if not then create /app1, /app2, .. then update syspath ?
      // 1. uncompress base64 et generate the directories to bind
      // 2. const repr = await structureRepr(imp.code);
      // repr.entryPoint: full path to main module
      // imp.name: name of the function to be exported (must be within entryPoint module)
      const testPath = path.join("tmp", imp.file);
      const sourceCode = Deno.readTextFileSync(testPath);
      await w.vm.registerModule(imp.modName, sourceCode);

      // TODO: add this change in postprocess

      console.log(imp.modName, ":\n", sourceCode);
      logger.info(`registered module: ${imp.modName} at ${testPath}`);
    }

    for (const m of materializers) {
      switch (m.name) {
        case "lambda":
          logger.info(`registering lambda: ${m.data.name}`);
          await w.vm.registerLambda(m.data.name as string, m.data.fn as string);
          break;
        case "def":
          logger.info(`registering def: ${m.data.name}`);
          await w.vm.registerDef(m.data.name as string, m.data.fn as string);
          break;
      }
    }

    return new PythonWasiRuntime(w);
  }

  async deinit(): Promise<void> {
    await this.w.vm.destroy();
    await this.w.terminate();
  }

  async collect() {
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
