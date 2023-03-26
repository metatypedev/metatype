// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "../../engine.ts";
import type { TypeGraphDS, TypeMaterializer } from "../../typegraph.ts";
import { Runtime } from "../Runtime.ts";
import { envOrFail } from "../../utils.ts";
import { Resolver, RuntimeInitParams } from "../../types.ts";
import { DenoRuntimeData } from "../../type_node.ts";
import * as ast from "graphql/ast";
import { InternalAuth } from "../../auth/protocols/internal.ts";
import { DenoMessenger } from "./deno_messenger.ts";
import { Task } from "./shared_types.ts";

const predefinedFuncs: Record<string, Resolver<Record<string, unknown>>> = {
  identity: ({ _, ...args }) => (args),
  true: () => true,
};

export class DenoRuntime extends Runtime {
  static runtimes: Map<string, Record<string, DenoRuntime>> = new Map();

  private constructor(
    private w: DenoMessenger,
    private registry: Map<string, number>,
    private typegraphName: string,
    private name: string,
    private tg: TypeGraphDS,
    private secrets: Record<string, string>,
  ) {
    super();
  }

  static getDefaultRuntime(tgName: string): Runtime {
    const rt = this.getInstancesIn(tgName)["default"];
    if (rt == null) {
      throw new Error(`could not find default runtime in ${tgName}`); // TODO: create
    }
    return rt;
  }

  static getInstancesIn(tgName: string) {
    const instances = DenoRuntime.runtimes.get(tgName);
    if (instances != null) {
      return instances;
    }
    const ret: Record<string, DenoRuntime> = {};
    DenoRuntime.runtimes.set(tgName, ret);
    return ret;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraph: tg, args, materializers } = params;
    const typegraphName = tg.types[0].title;

    const { worker: name } = args as unknown as DenoRuntimeData;
    if (name == null) {
      throw new Error(
        `Cannot create deno runtime: worker name required, got ${name}`,
      );
    }

    const tgName = tg.types[0].title;
    const tgRuntimes = DenoRuntime.getInstancesIn(tgName);
    const runtime = tgRuntimes[name];
    if (runtime != null) {
      return runtime;
    }

    const secrets: Record<string, string> = {};
    for (const m of materializers) {
      for (const secretName of m.data.secrets as [] ?? []) {
        secrets[secretName] = envOrFail(typegraphName, secretName);
      }
    }

    const registry = new Map<string, number>();
    const ops = new Map<number, Task>();

    let registryCount = 0;
    for (const mat of materializers) {
      if (mat.name === "function") {
        const code = mat.data.script as string;

        ops.set(registryCount, {
          type: "register_func",
          fnCode: code,
          op: registryCount,
          verbose: false,
        });
        registry.set(code, registryCount);
        registryCount += 1;
      } else if (mat.name === "module") {
        const code = mat.data.code as string;

        ops.set(registryCount, {
          type: "register_import_func",
          moduleCode: code,
          op: registryCount,
          verbose: false,
        });
        registry.set(code, registryCount);
        registryCount += 1;
      }
    }

    const w = new DenoMessenger(
      name,
      (args.permissions ?? {}) as Deno.PermissionOptionsObject,
      false,
      ops,
    );

    if (Deno.env.get("DENO_TESTING") === "true") {
      await w.disableLazyness();
    }

    const rt = new DenoRuntime(
      w,
      registry,
      typegraphName,
      name,
      tg,
      secrets,
    );
    tgRuntimes[name] = rt;
    return rt;
  }

  async deinit(): Promise<void> {
    await this.w.terminate();
    const tgName = this.tg.types[0].title;
    delete DenoRuntime.getInstancesIn(tgName)[this.name];
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    verbose: boolean,
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
      return [
        stage.withResolver(this.delegate(stage.props.materializer, verbose)),
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

  delegate(mat: TypeMaterializer, verbose: boolean): Resolver {
    if (mat.name === "predefined_function") {
      const func = predefinedFuncs[mat.data.name as string];
      if (!func) {
        throw new Error(`predefined function ${mat.data.name} not found`);
      }
      return func;
    }

    const secrets = (mat.data.secrets as [] ?? []).reduce(
      (agg, secretName) => ({ ...agg, [secretName]: this.secrets[secretName] }),
      {},
    );

    if (mat.name === "import_function") {
      const modMat = this.tg.materializers[mat.data.mod as number];
      const op = this.registry.get(modMat.data.code as string)!;

      return async ({ _: { context, parent, info: { url } }, ...args }) => {
        const token = await InternalAuth.emit();

        return this.w.execute(op, {
          type: "import_func",
          args,
          internals: {
            parent,
            context,
            secrets,
            effect: mat.effect.effect ?? null,
            meta: {
              url: `${url.protocol}//${url.host}/${this.typegraphName}`,
              token,
            },
          },
          name: mat.data.name as string,
          verbose,
        });
      };
    }

    if (mat.name === "function") {
      const op = this.registry.get(mat.data.script as string)!;
      return async ({ _: { context, parent, info: { url } }, ...args }) => {
        const token = await InternalAuth.emit();

        return this.w.execute(op, {
          type: "func",
          args,
          internals: {
            parent,
            context,
            secrets,
            effect: mat.effect.effect ?? null,
            meta: {
              url: `${url.protocol}//${url.host}/${this.typegraphName}`,
              token,
            },
          },
          verbose,
        });
      };
    }

    throw new Error("unsupported materializer ${mat.name}");
  }
}
