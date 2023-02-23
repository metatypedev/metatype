// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Deferred, deferred } from "std/async/deferred.ts";
import * as Sentry from "sentry";
import { ComputeStage } from "../engine.ts";
import type { TypeGraph, TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Runtime } from "./Runtime.ts";
import { envSharedWithWorkers, getLogger } from "../log.ts";
import { FuncTask, ImportFuncTask, Task, TaskContext } from "./utils/codes.ts";
import { ensure, envOrFail } from "../utils.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { DenoRuntimeData } from "../type_node.ts";
import { dirname, fromFileUrl, resolve, toFileUrl } from "std/path/mod.ts";
import * as ast from "graphql/ast";

const logger = getLogger(import.meta);

const localDir = dirname(fromFileUrl(import.meta.url));
const workerFile = toFileUrl(resolve(localDir, "utils/deno-worker.ts"));

const defaultPermissions = {
  env: envSharedWithWorkers,
  hrtime: false,
  net: false,
  ffi: false,
  read: false,
  run: false,
  write: false,
};

export class DenoRuntime extends Runtime {
  w: OnDemandWorker;
  static defaultRuntimes: Map<TypeGraph, DenoRuntime> = new Map();
  static runtimes: Map<string, Record<string, DenoRuntime>> = new Map();

  private constructor(
    private name: string,
    permissions: Deno.PermissionOptionsObject,
    lazy: boolean,
    private tg: TypeGraphDS,
    private secrets: Record<string, string>,
  ) {
    super();
    this.w = new OnDemandWorker(name, permissions, lazy, tg);
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
    const ret = {};
    DenoRuntime.runtimes.set(tgName, ret);
    return ret;
  }

  static init(params: RuntimeInitParams): Runtime {
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

    const rt = new DenoRuntime(
      name,
      (args.permissions ?? {}) as Deno.PermissionOptionsObject,
      false,
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
    ensure(
      mat.name === "function" || mat.name === "import_function" ||
        mat.name === "predefined_function",
      `unsupported materializer ${mat.name}`,
    );
    const secrets = (mat.data.secrets as [] ?? []).reduce(
      (agg, secretName) => ({ ...agg, [secretName]: this.secrets[secretName] }),
      {},
    );
    return async ({ _: { context, parent }, ...args }) => {
      return await this.w.execTask({
        args,
        internals: {
          parent,
          context,
          secrets,
        },
        mat,
      }, verbose);
    };
  }
}

interface TaskInit {
  args: Record<string, unknown>;
  internals: TaskContext;
  mat: TypeMaterializer;
}

interface TaskData {
  promise: Deferred<unknown>;
  hooks: Array<() => void | Promise<void>>;
}

interface SuccessMessage {
  id: number; // task id
  value: unknown;
}

interface ErrorMessage {
  id: number; // task id
  error: string;
}

type Message = SuccessMessage | ErrorMessage;

const resetModulus = 1_000_000;
const inactivityThreshold = 1;
const inactivityIntervalMs = 15_000;

class OnDemandWorker {
  lazyWorker?: Worker;
  name: string;

  tasks: Map<number, TaskData> = new Map();
  counter = 0;

  gcState = 0;
  gcInterval?: number;

  modules: Map<TypeMaterializer, number> = new Map();
  inlineFns: Map<TypeMaterializer, number> = new Map();

  constructor(
    name: string,
    private permissions: Deno.PermissionOptionsObject,
    lazy: boolean,
    private tg: TypeGraphDS,
  ) {
    this.name = name;
    if (lazy) {
      this.enableLazyWorker();
    } else {
      this.worker();
    }
  }

  enableLazyWorker() {
    logger.info(`enable laziness`);
    clearInterval(this.gcInterval);
    this.gcInterval = setInterval(
      () => this.checkJobLess(),
      inactivityIntervalMs,
    );
  }

  disableLazyWorker() {
    logger.info(`disable laziness`);
    clearInterval(this.gcInterval);
    this.worker();
  }

  checkJobLess(): void {
    if (!this.lazyWorker) {
      return;
    }

    const activity = (this.counter - this.gcState + resetModulus) %
      resetModulus;
    this.gcState = this.counter;

    if (activity <= inactivityThreshold && this.tasks.size < 1) {
      logger.info(
        `lazy close worker ${this.name} for ${this.tg.types[0].title}`,
      );
      this.lazyWorker.terminate();
      this.lazyWorker = undefined;
    }
  }

  async terminate(): Promise<void> {
    clearInterval(this.gcInterval);
    await Promise.all([...this.tasks.values()].map((t) => t.promise));
    logger.info(`close worker ${this.name} for ${this.tg.types[0].title}`);
    if (this.lazyWorker) {
      this.lazyWorker.terminate();
      this.lazyWorker = undefined;
    }
  }

  worker(): Worker {
    if (!this.lazyWorker) {
      logger.info(`spawn worker ${this.name} for ${this.tg.types[0].title}`);
      this.lazyWorker = new Worker(workerFile, {
        type: "module",
        deno: {
          namespace: false,
          // by default a worker will inherit permissions
          permissions: {
            ...defaultPermissions,
            net: true,
            // ...this.permissions,
            // On the current version of deno,
            // permissions on workers do not work as expected.
            // All workers get the permissions of the first spawned worker.
          },
        },
      } as WorkerOptions);
      this.lazyWorker.postMessage({
        name: this.name,
      });
      this.lazyWorker.onmessage = async (event) => {
        const message = event.data as Message;
        const { id } = message;
        const task = this.tasks.get(id)!;
        if (Object.hasOwnProperty.call(message, "value")) {
          task.promise.resolve((message as SuccessMessage).value);
        } else {
          task.promise.reject(new Error((message as ErrorMessage).error));
        }
        for await (const hook of task.hooks) {
          await hook();
        }
        this.tasks.delete(id);
      };
      this.lazyWorker.onerror = (error) => {
        Sentry.captureException(error);
        throw error;
      };
    }
    return this.lazyWorker;
  }

  private nextId(): number {
    const n = this.counter++;
    this.counter %= resetModulus;
    return n;
  }

  execTask(task: TaskInit, verbose: boolean): Promise<unknown> {
    const { args, internals, mat } = task;

    const exec = (
      task: Task,
      hooks: Array<() => Promise<void>> = [],
    ): Promise<unknown> => {
      const promise = deferred<unknown>();
      this.worker().postMessage(task);
      this.tasks.set(task.id, { promise, hooks });
      return promise;
    };

    switch (mat.name) {
      case "function": {
        const id = this.nextId();
        let fnRef: Pick<FuncTask, "fnId" | "code">;
        if (!this.inlineFns.has(mat)) {
          this.inlineFns.set(mat, id);
          fnRef = { fnId: id, code: mat.data.script as string };
        } else {
          fnRef = { fnId: this.inlineFns.get(mat)! };
        }
        return exec({
          type: "func",
          id,
          args,
          internals,
          verbose,
          ...fnRef,
        });
      }

      case "import_function": {
        const id = this.nextId();
        const modMat = this.tg.materializers[mat.data.mod as number];
        let modRef: Pick<ImportFuncTask, "moduleId" | "moduleCode">;
        if (!this.modules.has(modMat)) {
          this.modules.set(modMat, id);
          modRef = { moduleId: id, moduleCode: modMat.data.code as string };
        } else {
          modRef = { moduleId: this.modules.get(modMat)! };
        }
        return exec({
          type: "import_func",
          id,
          args,
          internals,
          name: mat.data.name as string,
          verbose,
          ...modRef,
        });
      }

      case "predefined_function": {
        return exec({
          type: "predefined_func",
          name: mat.data.name as string,
          id: this.nextId(),
          args,
          internals,
          verbose,
        });
      }

      default:
        throw new Error(`unsupported materializer "${mat.name}"`);
    }
  }
}
