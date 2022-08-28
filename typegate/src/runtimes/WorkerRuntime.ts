import { Deferred, deferred } from "std/async/deferred.ts";
import { ComputeStage } from "../engine.ts";
import type { TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeInitParams } from "./Runtime.ts";
import { getLogger } from "../log.ts";
import mapValues from "https://deno.land/x/lodash@4.17.15-es/mapValues.js";
import {
  CodeList,
  Codes,
  createFuncStatus,
  createModuleStatus,
  FuncStatus,
  FuncTask,
  FunctionMaterializerData,
  ModuleStatus,
  ModuleTask,
} from "./utils/codes.ts";
import { ensure } from "../utils.ts";

const logger = getLogger(import.meta);

const workerFile = new URL("../src/runtimes/utils/worker.ts", Deno.mainModule)
  .href;

export class WorkerRuntime extends Runtime {
  w: OnDemandWorker;

  private constructor(private name: string, lazy: boolean, codes: Codes) {
    super();
    this.w = new OnDemandWorker(name, lazy, codes);
  }

  static init(params: RuntimeInitParams): Runtime {
    const { typegraph: tg, materializers, config, args } = params;

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

    return new WorkerRuntime(args.name as string, config.lazy as boolean, {
      modules,
      funcs,
    });
  }

  deinit(): Promise<void> {
    return this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    if (!stage.props.materializer) {
      throw new Error("No materializer specified for WorkerRuntime.");
    }
    return [
      new ComputeStage({
        ...stage.props,
        resolver: this.delegate(stage.props.materializer),
      }),
    ];
  }

  delegate(mat: TypeMaterializer): Resolver {
    ensure(mat.name === "function", `unsupported materializer ${mat.name}`);
    return async ({ _: context, ...args }) => {
      return await this.w.execTask({
        args,
        context,
        matArgs: mat.data as unknown as FunctionMaterializerData,
      });
    };
  }
}

interface TaskInit {
  args: Record<string, unknown>;
  context: Record<string, string>;
  matArgs: FunctionMaterializerData;
}

interface TaskData {
  promise: Deferred<unknown>;
  hooks: Array<() => void | Promise<void>>;
}

const resetModulus = 1_000_000;
const inactivityThreshold = 1;
const inactivityIntervalMs = 15_000;

class OnDemandWorker {
  lazyWorker?: Worker;
  name: string;
  readonly codes: Codes;

  tasks: Map<number, TaskData> = new Map();
  counter = 0;

  gcState = 0;
  gcInterval?: number;

  modules: Map<string, ModuleStatus> = new Map();
  funcs: Map<string, FuncStatus> = new Map();

  constructor(name: string, lazy: boolean, codes: Codes) {
    this.name = name;
    if (lazy) {
      this.enableLazyWorker();
    } else {
      this.worker();
    }
    this.codes = codes;
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
          permissions: {
            read: ["/tmp/"],
          },
        },
      } as WorkerOptions);
      this.lazyWorker.onmessage = (event) => {
        const { id, data } = event.data as { id: number; data: unknown };
        const task = this.tasks.get(id)!;
        task.promise.resolve(data);
        task.hooks.forEach((hook) => hook());
        this.tasks.delete(id);
      };
      this.lazyWorker.onerror = (error) => {
        console.error(error);
      };
    }
    return this.lazyWorker;
  }

  private nextId(): number {
    const n = this.counter++;
    this.counter %= resetModulus;
    return n;
  }

  async execTask(task: TaskInit): Promise<unknown> {
    const {
      args,
      context,
      matArgs: { name, import_from },
    } = task;

    if (import_from == null) {
      // function
      const status = this.codes.funcs[name];
      ensure(status != null, `unknown function "${name}"`);
      const wrappedCode = {} as { code?: string };
      if (!status.loaded) {
        wrappedCode.code = status.code.source;
        status.loaded = true;
      }

      const promise = deferred<unknown>();
      const id = this.nextId();
      this.worker().postMessage({
        type: "func",
        name,
        id,
        args,
        context,
        ...wrappedCode,
      } as FuncTask);

      this.tasks.set(id, { promise, hooks: [] });
      return promise;
    } else {
      // module
      const status = this.codes.modules[import_from];
      ensure(status != null, `unknown module "${import_from}"`);
      const hooks = [] as Array<() => void>;
      if (status.loadedAt == null) {
        const path = await Deno.makeTempFile({ suffix: ".js" });
        await Deno.writeTextFile(path, status.code.source);
        status.loadedAt = path;
        hooks.push(() => Deno.remove(path));
      }

      const promise = deferred<unknown>();
      const id = this.nextId();
      this.worker().postMessage({
        type: "module",
        name,
        id,
        path: status.loadedAt,
        args,
        context,
      } as ModuleTask);

      this.tasks.set(id, { promise, hooks });
      return promise;
    }
  }
}
