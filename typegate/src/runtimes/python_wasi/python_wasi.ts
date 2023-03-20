// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import Context from "std/wasi/snapshot_preview1.ts";
import { maxi32 } from "../../utils.ts";
import { Memory, RustResult } from "./memory.ts";
import { gunzip, tar } from "compress";
import { getLogger } from "../../log.ts";
import { Deferred, deferred } from "std/async/deferred.ts";
import { Runtime } from "../Runtime.ts";
import { RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine.ts";

const logger = getLogger(import.meta);

const pythonWasiReactorUrl =
  "https://github.com/metatypedev/python-wasi-reactor/releases/download/v0.1.0/python3.11.1-wasi-reactor.wasm.tar.gz";

const cachePath = "./tmp/python3.11.1-wasi-reactor.wasm";

export class PythonWasiRuntime extends Runtime {
  private constructor(
    private w: WasmWorker,
    private fnNames: string[],
  ) {
    super();
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { materializers } = params;
    const w = await WasmWorker.init();

    const fnNames = [];

    for (const m of materializers) {
      fnNames.push(m.data.name as string);
      const register = await w.exec("register", m.data.name, m.data.fn);
      if (register.error) {
        throw new Error(register.error);
      }
    }

    return new PythonWasiRuntime(
      w,
      fnNames,
    );
  }

  async deinit(): Promise<void> {
    for (const name of this.fnNames) {
      const unregister = await this.w.exec("unregister", name);
      if (unregister.error) {
        logger.error(unregister.error);
      }
    }
    await this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const { name } = stage.props.materializer?.data ?? {};
    return [
      stage.withResolver((args) =>
        this.w.apply(name as string, JSON.stringify(args)).then((x) =>
          JSON.parse(x as string)
        )
      ),
    ];
  }
}

class WasmWorker {
  private counter = 0;

  private constructor(
    private tasks: Map<number, Promise<unknown>>,
    private memory: Memory,
    private instance: WebAssembly.Instance,
  ) {
  }

  static async init(): Promise<WasmWorker> {
    if (!await Deno.stat(cachePath).then((f) => f.isFile).catch(() => false)) {
      const res = await fetch(pythonWasiReactorUrl);
      const archivePath = await Deno.makeTempFile({
        dir: "./tmp",
      });
      const buffer = await res.arrayBuffer();
      const archive = await gunzip(new Uint8Array(buffer));
      await Deno.writeFile(archivePath, archive);
      await tar.uncompress(archivePath, "./tmp");
    }

    const binary = await Deno.readFile(cachePath);
    const module = await WebAssembly.compile(binary);
    const context = new Context({
      env: {},
      args: [],
      preopens: {},
    });

    const tasks = new Map<number, Deferred<unknown>>();

    const instance = new WebAssembly.Instance(module, {
      wasi_snapshot_preview1: {
        sock_accept(fd: any, _flags: any) {
          return fd;
        },
        ...context.exports,
      },
      host: {
        callback(id: number, ptr: number) {
          const ret = memory.decode(ptr);
          const p = tasks.get(id);
          if (!p) {
            logger.error(`callback called on completed task ${id}`);
            return;
          }
          if (ret.data) {
            p.resolve(ret.data);
          } else {
            p.reject(ret.error);
          }
        },
      },
    });
    const memory = new Memory(instance.exports);

    context.initialize(instance);
    const { init } = instance.exports as Record<
      string,
      CallableFunction
    >;
    init();

    return new WasmWorker(tasks, memory, instance);
  }

  exec(exportName: string, ...args: unknown[]): RustResult {
    const fn = this.instance.exports[exportName] as CallableFunction | null;
    if (!fn) {
      throw new Error(`export ${exportName} not found`);
    }
    return this.memory.decode(fn(...this.memory.encode(...args)));
  }

  apply(name: string, args: string): Promise<unknown> {
    const apply = this.instance.exports.apply as CallableFunction;
    const id = this.nextId();
    const p = deferred<unknown>();
    this.tasks.set(id, p);
    apply(...this.memory.encode(id, name, args));
    return p;
  }

  async terminate(): Promise<void> {
    await Promise.all([...this.tasks.values()]);
  }

  private nextId(): number {
    const n = this.counter++;
    this.counter %= maxi32;
    return n;
  }
}
