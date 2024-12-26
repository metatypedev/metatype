// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ComputeStage } from "../../engine/query_engine.ts";
import {
  TypeGraph,
  type TypeGraphDS,
  type TypeMaterializer,
} from "../../typegraph/mod.ts";
import type { Typegate } from "../../typegate/mod.ts";
import { Runtime } from "../Runtime.ts";
import type { Resolver, RuntimeInitParams } from "../../types.ts";
import type {
  DenoRuntimeData,
  Injection,
  InjectionData,
  TypeNode,
} from "../../typegraph/types.ts";
import * as ast from "graphql/ast";
import { InternalAuth } from "../../services/auth/protocols/internal.ts";
import { DenoMessenger } from "./deno_messenger.ts";
import type { Task } from "./shared_types.ts";
import { path } from "compress/deps.ts";
import { globalConfig as config } from "../../config.ts";
import { createArtifactMeta } from "../utils/deno.ts";
import { getInjectionValues } from "../../engine/planner/injection_utils.ts";
import DynamicInjection from "../../engine/injection/dynamic.ts";
import { getLogger } from "../../log.ts";
import { TaskBase } from "../agent/worker_manager.ts";
import { envSharedWithWorkers } from "../../config/shared.ts";

const logger = getLogger(import.meta);

const predefinedFuncs: Record<
  string,
  (param: any) => Resolver<Record<string, unknown>>
> = {
  identity: () => ({ _, ...args }) => args,
  true: () => () => true,
  false: () => () => false,
  internal_policy: () => ({ _: { context } }) =>
    context.provider === "internal",
  context_check: ({ key, value }) => {
    let check: (value: any) => boolean;
    switch (value.type) {
      case "not_null":
        check = (v) => v != null;
        break;
      case "value":
        check = (v) => v === value.value;
        break;
      case "pattern":
        check = (v) => new RegExp(value.value).test(v);
        break;
      default:
        throw new Error(`unreachable: ${value}`);
    }
    const path = key.split(".");
    return ({ _: { context } }) => {
      let value: any = context;
      for (const segment of path) {
        value = value?.[segment];
      }
      return check(value);
    };
  },
};

interface Task extends TaskBase {
  module: string;
  functionName: string;
}

class DenoWorker extends BaseWorker<{}, {}> {
  #id: string;
  #worker: Worker;

  constructor(id: string) {
    super();
    this.#id = id;
    this.#worker = new Worker(import.meta.resolve("./worker.ts"), {
      name: id,
      type: "module",
      deno: {
        permissions: {
          net: true,
          read: "inherit",
          sys: "inherit", // what?
          run: false,
          write: false,
          ffi: false,
          env: envSharedWithWorkers,
        },
      },
    });
  }

  sendMessage(m: {}) {
    // TODO
    this.#worker.postMessage(m);
  }

  listen(handler: (m: {}) => void) {
    // TODO
    this.#worker.onmessage = (e) => handler(e.data);
  }

  destroy() {
    this.#worker.terminate();
  }
}

class WorkerManager extends BaseWorkerManager<Task, {}, {}> {
  constructor() {
    super((id: string) => new DenoWorker(id));
  }

  async handleEvent(
    event: WorkerEvent<Event>,
    worker: Worker,
  ): Promise<Result> {
    switch (event.type) {
      case "IMPORT": {
        const { op, task } = event.data;
        if (!registry.has(op)) {
          throw new Error(`no module registered with id ${op}`);
        }

        const mod = registry.get(op)! as TaskModule;
        if (task.name in mod && typeof mod[task.name] === "function") {
          return await mod[task.name](task.args, task.internals);
        }
        throw new Error(`"${task.name}" is not a valid method`);
      }
      case "RUN_INLINE": {
        const { op, task } = event.data;
        if (!registry.has(op)) {
          throw new Error(`no function registered with id ${op}`);
        }

        const fn = registry.get(op)! as TaskExec;
        return await fn(task.args, task.internals);
      }
      default:
        throw new Error(`unsupported event type ${event.type}`);
    }
  }
}

export class DenoRuntime extends Runtime {
  private constructor(
    typegraphName: string,
    uuid: string,
    private tg: TypeGraphDS,
    private typegate: Typegate,
    private workerManager: WorkerManager,
    private registry: Map<string, number>,
    private secrets: Record<string, string>,
  ) {
    super(typegraphName, uuid);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const {
      typegraph: tg,
      typegraphName,
      args,
      materializers,
      secretManager,
      typegate,
    } = params as RuntimeInitParams<DenoRuntimeData>;
    const artifacts = tg.meta.artifacts;

    const { worker: name } = args as unknown as DenoRuntimeData;
    if (name == null) {
      throw new Error(
        `Cannot create deno runtime: worker name required, got ${name}`,
      );
    }

    const secrets: Record<string, string> = {};
    for (const m of materializers) {
      let secrets = (m.data.secrets as string[]) ?? [];
      if (m.name === "outjection") {
        secrets = m.data.source === "secret"
          ? [...getInjectionValues(m.data)]
          : [];
      }
      for (const secretName of (m.data.secrets as []) ?? []) {
        secrets[secretName] = secretManager.secretOrFail(secretName);
      }
    }
    for (const secretName of tg.meta.outjectionSecrets ?? []) {
      secrets[secretName] = secretManager.secretOrFail(secretName);
    }

    // maps from the module code to the op number/id
    const registry = new Map<string, number>();
    const ops = new Map<number, Task>();

    const uuid = crypto.randomUUID();
    const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");

    let registryCount = 0;
    for (const mat of materializers) {
      if (mat.name === "function") {
        const code = mat.data.script as string;
        ops.set(registryCount, {
          type: "register_func",
          fnCode: code,
          op: registryCount,
          verbose: config.debug,
        });
        registry.set(code, registryCount);
        registryCount += 1;
      } else if (mat.name === "module") {
        const matData = mat.data;
        const entryPoint = artifacts[matData.entryPoint as string];
        const depMetas = (matData.deps as string[]).map((dep) =>
          createArtifactMeta(typegraphName, artifacts[dep])
        );
        const moduleMeta = createArtifactMeta(typegraphName, entryPoint);

        // Note:
        // Worker destruction seems to have no effect on the import cache? (deinit() => stop(worker))
        // hence the use of contentHash
        const entryModulePath = await typegate.artifactStore.getLocalPath(
          moduleMeta,
          depMetas,
        );

        // Note:
        // Worker destruction seems to have no effect on the import cache? (deinit() => stop(worker))
        // hence the use of contentHash
        ops.set(registryCount, {
          type: "register_import_func",
          modulePath: entryModulePath,
          op: registryCount,
          verbose: config.debug,
        });

        // TODO: can a single aritfact be used by multiple materializers?
        registry.set(entryPoint.hash, registryCount);
        registryCount += 1;
      }
    }

    const w = new DenoMessenger(
      name,
      {
        ...(args.permissions ?? {}),
        read: [basePath],
      } as Deno.PermissionOptionsObject,
      false,
      ops,
      typegate.config.base,
    );

    if (Deno.env.get("DENO_TESTING") === "true") {
      w.disableLazyness();
    }

    const rt = new DenoRuntime(
      typegraphName,
      uuid,
      tg,
      typegate,
      w,
      registry,
      secrets,
    );

    return rt;
  }

  async deinit(): Promise<void> {
    await this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    if (stage.props.node === "__typename") {
      const getTypename = () => {
        const parentStage = stage.props.parent;
        if (parentStage == null) {
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
        }

        const idSlice = stage.id().slice(parentStage.id().length);
        if (idSlice.startsWith("$")) {
          return idSlice.split(".")[0].slice(1);
        }
        return parentStage.props.outType.title;
      };

      const typename = getTypename();

      return [stage.withResolver(() => typename)];
    }

    const mat = stage.props.materializer;
    if (mat != null) {
      if (mat.name === "outjection") {
        return [
          stage.withResolver(
            this.outject(stage.props.outType, mat.data as Injection),
          ),
        ];
      }
      return [stage.withResolver(this.delegate(mat, verbose))];
    }

    if (this.tg.meta.namespaces!.includes(stage.props.typeIdx)) {
      return [stage.withResolver(() => ({}))];
    }

    return [
      stage.withResolver(({ _: { parent } }) => {
        if (stage.props.parent == null) {
          // namespace
          return {};
        }
        const resolver = parent[stage.props.node];
        return (typeof resolver === "function" ? resolver() : resolver) ?? null;
      }),
    ];
  }

  delegate(
    mat: TypeMaterializer,
    verbose: boolean,
    pulseCount?: number,
  ): Resolver {
    if (mat.name === "predefined_function") {
      const func = predefinedFuncs[mat.data.name as string];
      if (!func) {
        throw new Error(`predefined function ${mat.data.name} not found`);
      }
      return func(mat.data.param);
    }

    if (mat.name === "static") {
      return () => mat.data.value;
    }

    const secrets = ((mat.data.secrets as []) ?? []).reduce(
      (agg, secretName) => ({ ...agg, [secretName]: this.secrets[secretName] }),
      {},
    );

    if (mat.name === "import_function") {
      const modMat = this.tg.materializers[mat.data.mod as number];
      const entryPoint =
        this.tg.meta.artifacts[modMat.data.entryPoint as string];
      const op = this.registry.get(entryPoint.hash)!;

      return async ({
        _: {
          context,
          parent,
          info: { url, headers },
        },
        ...args
      }) => {
        const token = await InternalAuth.emit(this.typegate.cryptoKeys);

        return await this.w.execute(
          op,
          {
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
              headers,
            },
            name: mat.data.name as string,
            verbose,
          },
          [],
          pulseCount,
        );
      };
    }

    if (mat.name === "function") {
      const op = this.registry.get(mat.data.script as string)!;
      return async ({
        _: {
          context,
          parent,
          info: { url, headers },
        },
        ...args
      }) => {
        console.log(">> executing function", mat.data.script);
        const token = await InternalAuth.emit(this.typegate.cryptoKeys);
        console.log({ internalToken: token });

        return await this.w.execute(
          op,
          {
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
              headers,
            },
            verbose,
          },
          [],
          pulseCount,
        );
      };
    }

    throw new Error(`unsupported materializer ${mat.name}`);
  }

  outject(typeNode: TypeNode, outjection: Injection): Resolver {
    switch (outjection.source) {
      case "static": {
        const value = JSON.parse(getInjectionData(outjection.data) as string);
        return () => value;
      }
      case "context": {
        const key = getInjectionData(outjection.data) as string;
        // TODO error if null
        return ({ _: { context } }) => context[key] ?? null;
      }
      case "secret": {
        const key = getInjectionData(outjection.data) as string;
        return () => this.secrets[key] ?? null;
      }
      case "random": {
        return () => TypeGraph.getRandomStatic(this.tg, typeNode, null);
      }
      case "dynamic": {
        const gen = getInjectionData(
          outjection.data,
        ) as keyof typeof DynamicInjection;
        return DynamicInjection[gen];
      }
      default: {
        logger.error(`unsupported outjection source '${outjection.source}'`);
        throw new Error(`unsupported outjection source '${outjection.source}'`);
      }
    }
  }
}

function getInjectionData(d: InjectionData) {
  if ("value" in d) {
    return d.value;
  }
  return d["none"] ?? null;
}
