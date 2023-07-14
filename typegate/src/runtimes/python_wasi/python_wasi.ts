// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";
import { Runtime } from "../Runtime.ts";
import { RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine.ts";
import { PythonWasmMessenger } from "./python_wasm_messenger.ts";
import { path } from "compress/deps.ts";
import { TypeGraph } from "../../typegraph.ts";
import { PythonVirtualMachine } from "./python_vm.ts";
import { Materializer } from "../../types/typegraph.ts";

const logger = getLogger(import.meta);

function generateVmIdentifier(mat?: Materializer) {
  const { mod } = mat?.data ?? {};
  if (mod !== undefined) {
    return `pymod_${mod}`;
  }
  return "default";
}

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

    logger.info(`initializing default vm: ${typegraphName}`);

    // add default vm for lambda/def
    const defaultVm = new PythonVirtualMachine();
    await defaultVm.setup("default");
    w.vmMap.set("default", defaultVm);

    const mods = materializers
      .filter((m) => m.name == "import_function")
      .map((m) => {
        const pyModMat = typegraph.materializers[m.data.mod as number];
        const code = pyModMat.data.code as string;
        const file = pyModMat.data.file as string;
        const modName = path.parse(file).name;
        const vmId = generateVmIdentifier(m);
        // TODO: move this logic to postprocess or python runtime
        m.data.name = `${modName}.${m.data.name as string}`;

        return { modName, vmId, file, code };
      });

    for (const { modName, vmId, file /*, code*/ } of mods) {
      const appDir = "tmp";
      const entryPoint = path.join("tmp", file);

      logger.info(`setup vm "${vmId}" for module ${modName}`);
      const vm = new PythonVirtualMachine();
      await vm.setup(vmId, appDir);
      w.vmMap.set(vmId, vm);

      const sourceCode = Deno.readTextFileSync(entryPoint);
      await vm.registerModule(modName, sourceCode);

      logger.info(
        `register module ${modName} to vm ${vmId} at ${entryPoint}`,
      );
    }

    for (const m of materializers) {
      switch (m.name) {
        case "lambda":
          logger.info(`registering lambda: ${m.data.name}`);
          await defaultVm.registerLambda(
            m.data.name as string,
            m.data.fn as string,
          );
          break;
        case "def":
          logger.info(`registering def: ${m.data.name}`);
          await defaultVm.registerDef(
            m.data.name as string,
            m.data.fn as string,
          );
          break;
      }
    }

    return new PythonWasiRuntime(w);
  }

  async deinit(): Promise<void> {
    for (const vm of this.w.vmMap.values()) {
      logger.info(`unregister vm: ${vm.getVmName()}`);
      await vm.destroy();
    }
    await this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const mat = stage.props.materializer;
    const { name } = mat?.data ?? {};
    const vmId = generateVmIdentifier(mat);
    return [
      stage.withResolver((args) => {
        return this.w.execute(name as string, { vmId, args });
      }),
    ];
  }
}
