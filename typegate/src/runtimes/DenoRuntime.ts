import { ComputeStage } from "../engine.ts";
import { Resolver, Runtime } from "./Runtime.ts";
import { RuntimeInitParams } from "./Runtime.ts";
import { getLogger } from "../log.ts";
import {
  CodeList,
  Codes,
  createFuncStatus,
  createModuleStatus,
  FuncStatus,
  FunctionMaterializerData,
  ModuleStatus,
  predefinedFuncs,
  TaskExec,
} from "./utils/codes.ts";
import { ensure } from "../utils.ts";
import mapValues from "https://deno.land/x/lodash@4.17.15-es/mapValues.js";
import { TypeMaterializer } from "../typegraph.ts";
import * as ast from "graphql_ast";

const logger = getLogger(import.meta);

export class DenoRuntime extends Runtime {
  codes: Codes;

  private constructor(codes: Codes) {
    super();
    this.codes = codes;
  }

  static init(params: RuntimeInitParams): Runtime {
    // one instance per typegraph, ensured by the serialization

    const { typegraph: tg, materializers } = params;

    for (const { name } of materializers) {
      ensure(name === "function", `unexpected materializer type "${name}"`);
    }

    const modules = mapValues(
      CodeList.from(tg.codes)
        .filterType("module")
        .byNamesIn(materializers.map(({ data }) => data.import_from as string)),
      createModuleStatus,
    ) as Record<string, ModuleStatus>;

    const funcs = mapValues(
      CodeList.from(tg.codes)
        .filterType("func")
        .byNamesIn(materializers.map(({ data }) => data.name as string)),
      createFuncStatus,
    ) as Record<string, FuncStatus>;

    return new DenoRuntime({ modules, funcs });
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    let resolver: Resolver;
    if (stage.props.node === "__typename") {
      resolver = () => stage.props.outType.name;
    } else if (stage.props.materializer == null) {
      resolver = ({ _: { parent } }) => {
        const resolver = parent[stage.props.node];
        const ret = typeof resolver === "function" ? resolver() : resolver;
        return ret;
      };
    } else {
      resolver = this.delegate(stage.props.materializer);
    }

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  delegate(mat: TypeMaterializer): Resolver {
    ensure(mat.name === "function", `unsupported materializer ${mat.name}`);

    const { name, import_from } = mat
      .data as unknown as FunctionMaterializerData;

    if (import_from == null) { // function
      let task: TaskExec;
      const status = this.codes.funcs[name];
      if (status == null) {
        ensure(
          Object.hasOwnProperty.call(predefinedFuncs, name),
          `unknown function "${name}"`,
        );
        task = predefinedFuncs[name];
      } else {
        if (!status.loaded) {
          status.task = new Function(
            `"use strict"; return ${status.code.source}`,
          )();
          status.loaded = true;
        }
        task = status.task!;
      }
      return ({ _: context, ...args }) => {
        logger.info(`exec func "${name}"`);
        return task(args, context);
      };
    }

    // module
    const status = this.codes.modules[import_from];
    ensure(status != null, `unknown module "${name}"`);
    const mod = Promise.resolve((async () => {
      if (status.loadedAt == null) {
        const path = await Deno.makeTempFile({ suffix: ".js" });
        await Deno.writeTextFile(path, status.code.source);
        const mod = await import(path);
        await Deno.remove(path);
        status.loadedAt = path;
        return mod;
      } else {
        return await import(status.loadedAt);
      }
    })());

    return async ({ _: context, ...args }) => {
      const m = await mod;
      logger.info(`exec func "${name}" from module "${status.loadedAt}"`);
      return m[name](args, context);
    };
  }
}
