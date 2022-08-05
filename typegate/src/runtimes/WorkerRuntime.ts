import { Deferred, deferred } from "std/async/deferred.ts";
import { ComputeStage } from "../engine.ts";
import type { TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeInitParams } from "./Runtime.ts";
import { getLogger } from "../log.ts";
import { TaskResult } from "./utils/types.ts";
import xxhash from "https://unpkg.com/xxhash-wasm@1.0.1/esm/xxhash-wasm.js";

const { h64 } = await xxhash();

const logger = getLogger(import.meta);

const workerFile = new URL("runtimes/utils/worker.ts", Deno.mainModule).href;

interface Code {
  type: "module" | "func";
  hash: string;
  code: string;
}

function typeFromMatName(name: string): "module" | "func" {
  switch (name) {
    case "task_module":
      return "module";
    case "task_func":
    case "policy":
      return "func";
    default:
      throw new Error(`Unsupported materializer "${name}"`);
  }
}

export class WorkerRuntime extends Runtime {
  w: OnDemandWorker;
  codes: Record<string, Code>;

  private constructor(lazy: boolean, codes: Record<string, Code>) {
    super();
    this.w = new OnDemandWorker(lazy);
    this.codes = codes;
  }

  static init(params: RuntimeInitParams): Runtime {
    const { materializers, config } = params;

    const codes = Object.fromEntries(materializers.map((mat) => {
      const code = mat.data.code as string;
      const type = typeFromMatName(mat.name);
      const hash = h64(code, 0n).toString(16);
      return [hash, { code, type, hash } as Code];
    }));

    return new WorkerRuntime(config.lazy as boolean, codes);
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
    const hash = h64(mat.data.code as string, 0n).toString(16);
    console.log(`delegate: ${hash}`);
    return async ({ _: context, ...args }) => {
      const { type, code } = this.codes[hash];
      switch (type) {
        case "module":
          return await this.w.execModuleTask({
            args,
            context,
            code,
            name: hash,
          });
        case "func":
          return await this.w.execFuncTask({ args, context, code, name: hash });
        default:
          throw new Error(`Unsupported task type "${type}"`);
      }
    };
  }
}

interface TaskInit {
  args: Record<string, unknown>;
  context: Record<string, string>;
  code: string;
  name: string;
}

interface ModuleStatus {
  path: string;
  imported: boolean;
}

interface FuncStatus {
  loaded: boolean;
}

interface TaskData {
  promise: Deferred<unknown>;
  type: "module" | "func";
  name: string;
}

const resetModulus = 1_000_000;
const inactivityThreshold = 1;
const inactivityIntervalMs = 15_000;

class OnDemandWorker {
  lazyWorker?: Worker;

  tasks: Map<number, TaskData> = new Map();
  counter = 0;

  gcState = 0;
  gcInterval?: number;

  modules: Map<string, ModuleStatus> = new Map();
  funcs: Map<string, FuncStatus> = new Map();

  constructor(lazy: boolean) {
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
          permissions: {
            read: [
              "/tmp/",
            ],
          },
        },
      } as WorkerOptions);
      this.lazyWorker.onmessage = (event) => {
        const { id, data } = event.data as TaskResult;
        const task = this.tasks.get(id)!;
        task.promise.resolve(JSON.parse(new TextDecoder().decode(data)));
        this.tasks.delete(id);
        switch (task.type) {
          case "func": {
            const status = this.funcs.get(task.name)!;
            status.loaded = true;
            break;
          }
          case "module": {
            const status = this.modules.get(task.name)!;
            status.imported = true;
            break;
          }
        }
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

  async execModuleTask(task: TaskInit): Promise<unknown> {
    const { args, context, name, code } = task;

    let status = this.modules.get(name);

    if (status == null) {
      const path = await Deno.makeTempFile({ suffix: ".ts" });
      await Deno.writeTextFile(path, code);
      status = { path, imported: false };
      this.modules.set(name, status);
    }

    const promise = deferred<ArrayBuffer>();
    const id = this.nextId();
    this.worker().postMessage({
      type: "module",
      name,
      id,
      path: status.path,
      data: new TextEncoder().encode(JSON.stringify({ args, context })).buffer,
    });
    this.tasks.set(id, {
      promise,
      type: "module",
      name,
    });
    return promise;
  }

  execFuncTask(task: TaskInit): Promise<unknown> {
    const { args, context, code, name } = task;

    let status = this.funcs.get(name);
    const wrappedCode = {} as { code?: string };
    if (status == null) {
      status = { loaded: false };
      this.funcs.set(name, status);
      wrappedCode.code = code;
    }

    const promise = deferred<unknown>();
    const id = this.nextId();
    this.worker().postMessage({
      type: "func",
      name,
      id,
      data: new TextEncoder().encode(
        JSON.stringify({ args, context, ...wrappedCode }),
      ).buffer,
    });
    this.tasks.set(id, { promise, type: "func", name });
    return promise;
  }
}
