import { ComputeStage } from "../engine.ts";
import { Resolver, Runtime } from "./Runtime.ts";
import { RuntimeInitParams } from "./Runtime.ts";
import { getLogger } from "../log.ts";
import {
  FunctionMaterializerData,
  predefinedFuncs,
  TaskExec,
} from "./utils/codes.ts";
import { ensure } from "../utils.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";

const logger = getLogger(import.meta);

export class DenoRuntime extends Runtime {
  modules: Map<TypeMaterializer, Promise<Record<string, TaskExec>>> = new Map();
  inlineFns: Map<TypeMaterializer, TaskExec> = new Map();

  private constructor(private tg: TypeGraphDS) {
    super();
  }

  static init(params: RuntimeInitParams): Runtime {
    // one instance per typegraph, ensured by the serialization

    const { typegraph: tg, materializers } = params;

    for (const { name } of materializers) {
      ensure(
        name === "function" || name === "predefined_function",
        `unexpected materializer type "${name}"`,
      );
    }

    return new DenoRuntime(tg);
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
      resolver = this.delegate(stage.props.materializer, verbose);
    }

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  delegate(mat: TypeMaterializer, verbose: boolean): Resolver {
    ensure(
      mat.name === "function" || mat.name === "predefined_function",
      `unsupported materializer ${mat.name}`,
    );

    switch (mat.name) {
      case "predefined_function": {
        const name = mat.data.name as string;
        if (Object.prototype.hasOwnProperty.call(predefinedFuncs, name)) {
          const fn = predefinedFuncs[mat.data.name as string];
          return ({ _: context, ...args }) => {
            verbose && logger.info(`exec predefined func: ${name}`);
            return fn(args, context);
          };
        } else {
          throw new Error(`Cannot find predefined function "${name}"}`);
        }
      }

      case "function": {
        if (!this.inlineFns.has(mat)) {
          const { fn_expr } = mat.data as unknown as FunctionMaterializerData;
          this.inlineFns.set(
            mat,
            new Function(
              `"use strict"; return ${fn_expr}`,
            )(),
          );
        }
        const fn = this.inlineFns.get(mat)!;
        return ({ _: context, ...args }) => {
          verbose && logger.info(`exec func: ${mat.data.fn_expr as string}`);
          return fn(args, context);
        };
      }

      case "import_function": {
        const modMat = this.tg.materializers[mat.data.mod as number];
        if (!this.modules.has(modMat)) {
          this.modules.set(
            modMat,
            Promise.resolve((async () => {
              return await import(
                `data:application/javascript;charset=utf8,${
                  encodeURIComponent(mat.data.code as string)
                }`
              );
            })()),
          );
        }

        const fnName = mat.data.name as string;
        const modulePromise = this.modules.get(modMat)!;

        return async ({ _: context, ...args }) => {
          verbose && logger.info(`exec func "${fnName}" from module`);
          const m = await modulePromise;
          m[fnName](args, context);
        };
      }
      default:
        throw new Error(`Invalid materializer name ${mat.name}`);
    }
  }
}
