// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";
import { Runtime } from "../Runtime.ts";
import { RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine.ts";
import { PythonWasmMessenger } from "./python_wasm_messenger.ts";
import { path } from "compress/deps.ts";
import { TypeGraph } from "../../typegraph/mod.ts";
import { PythonVirtualMachine } from "./python_vm.ts";
import { Materializer } from "../../types/typegraph.ts";
import { structureRepr } from "../../utils.ts";
import { uncompress } from "../../utils.ts";
import * as ast from "graphql/ast";

const logger = getLogger(import.meta);

function generateVmIdentifier(mat: Materializer) {
  const { mod } = mat.data ?? {};
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

    logger.info(`initializing default vm: ${typegraphName}`);

    // add default vm for lambda/def
    const defaultVm = new PythonVirtualMachine();
    await defaultVm.setup("default");
    w.vmMap.set("default", defaultVm);

    for (const m of materializers) {
      switch (m.name) {
        case "lambda": {
          logger.info(`registering lambda: ${m.data.name}`);
          await defaultVm.registerLambda(
            m.data.name as string,
            m.data.fn as string,
          );
          break;
        }
        case "def": {
          logger.info(`registering def: ${m.data.name}`);
          await defaultVm.registerDef(
            m.data.name as string,
            m.data.fn as string,
          );
          break;
        }
        case "import_function": {
          const pyModMat = typegraph.materializers[m.data.mod as number];
          const code = pyModMat.data.code as string;

          const repr = await structureRepr(code);
          const vmId = generateVmIdentifier(m);
          const basePath = path.join(
            "tmp",
            "scripts",
            typegraphName,
            "python",
            vmId,
          );
          const outDir = path.join(basePath, repr.hashes.entryPoint);
          const entries = await uncompress(
            outDir,
            repr.base64,
          );
          logger.info(`uncompressed ${entries.join(", ")} at ${outDir}`);

          const modName = path.parse(repr.entryPoint).name;

          // TODO: move this logic to postprocess or python runtime
          m.data.name = `${modName}.${m.data.name as string}`;

          logger.info(`setup vm "${vmId}" for module ${modName}`);
          const vm = new PythonVirtualMachine();

          // for python modules, imports must be inside a folder above or same directory
          const entryPointFullPath = path.join(outDir, repr.entryPoint);
          const sourceCode = Deno.readTextFileSync(entryPointFullPath);

          // prepare vm
          await vm.setup(vmId, path.parse(entryPointFullPath).dir);
          w.vmMap.set(vmId, vm);
          await vm.registerModule(modName, sourceCode);

          logger.info(
            `register module "${modName}" to vm "${vmId}" located at "${entryPointFullPath}"`,
          );
          break;
        }
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
    if (stage.props.node === "__typename") {
      return [stage.withResolver(() => {
        const { parent: parentStage } = stage.props;
        if (parentStage != null) {
          return parentStage.props.outType.title;
        }
        switch (stage.props.operationType) {
          case ast.OperationTypeNode.QUERY:
            return "Query";
          case ast.OperationTypeNode.MUTATION:
            return "Mutation";
          default:
            throw new Error(
              `Unsupported operation type '${stage.props.operationType}'`,
            );
        }
      })];
    }

    if (stage.props.materializer != null) {
      const mat = stage.props.materializer;
      const { name } = mat.data ?? {};
      const vmId = generateVmIdentifier(mat);
      return [
        stage.withResolver((args) =>
          this.w.execute(name as string, { vmId, args })
        ),
      ];
    }

    if (stage.props.outType.config?.__namespace) {
      return [stage.withResolver(() => ({}))];
    }

    return [stage.withResolver(({ _: { parent } }) => {
      if (stage.props.parent == null) { // namespace
        return {};
      }
      const resolver = parent[stage.props.node];
      return typeof resolver === "function" ? resolver() : resolver;
    })];
  }
}
