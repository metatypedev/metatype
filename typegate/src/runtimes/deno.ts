// Copyright Metatype under the Elastic License 2.0.

import { Deferred, deferred } from "std/async/deferred.ts";
import * as Sentry from "sentry";
import { ComputeStage } from "../engine.ts";
import type { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Runtime } from "./Runtime.ts";
import { getLogger } from "../log.ts";
import { FuncTask, ImportFuncTask, Task, TaskContext } from "./utils/codes.ts";
import { ensure } from "../utils.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";

const logger = getLogger(import.meta);

const workerFile =
  new URL("../src/runtimes/utils/deno-worker.ts", Deno.mainModule)
    .href;

const defaultPermissions = {
  env: false,
  hrtime: false,
  net: false,
  ffi: false,
  read: false,
  run: false,
  write: false,
};

export class DenoRuntime extends Runtime {
  w: OnDemandWorker;

  private constructor(
    name: string,
    permissions: Deno.PermissionOptionsObject,
    _lazy: boolean,
    tg: TypeGraphDS,
  ) {
    super();
    this.w = new OnDemandWorker(name, permissions, false, tg);
  }

  static init(params: RuntimeInitParams): Runtime {
    const { typegraph: tg, config, args } = params;

    return new DenoRuntime(
      args.worker as string,
      (args.permissions ?? {}) as Deno.PermissionOptionsObject,
      config.lazy as boolean ?? false,
      tg,
    );
  }

  deinit(): Promise<void> {
    return this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
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
      mat.name === "function" || mat.name === "import_function" ||
        mat.name === "predefined_function",
      `unsupported materializer ${mat.name}`,
    );
    return async ({ _: { context, parent }, ...args }) => {
      return await this.w.execTask({
        args,
        internals: {
          parent,
          context,
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
      logger.info(`lazy close`);
      this.lazyWorker.terminate();
      this.lazyWorker = undefined;
    }
  }

  async terminate(): Promise<void> {
    clearInterval(this.gcInterval);
    await Promise.all([...this.tasks.values()].map((t) => t.promise));
    logger.info(`close`);
    if (this.lazyWorker) {
      this.lazyWorker.terminate();
      this.lazyWorker = undefined;
    }
  }

  worker(): Worker {
    if (!this.lazyWorker) {
      logger.info(`spawn`);
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
          fnRef = { fnId: id, code: mat.data.fn_expr as string };
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
