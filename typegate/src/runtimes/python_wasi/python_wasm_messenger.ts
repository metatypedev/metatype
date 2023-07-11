// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import Context from "std/wasi/snapshot_preview1.ts";
import { Memory, RustResult } from "./memory.ts";
import { gunzip, tar } from "compress/mod.ts";
import { AsyncMessenger } from "../patterns/messenger/async_messenger.ts";
import config from "../../config.ts";
import { join } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";

const pythonWasiReactorUrl =
  "https://github.com/metatypedev/python-wasi-reactor/releases/download/v0.1.0/python3.11.1-wasi-reactor.wasm.tar.gz";

const cachePath = join(config.tmp_dir, "python3.11.1-wasi-reactor.wasm");

export class PythonWasmMessenger extends AsyncMessenger<
  [WebAssembly.Instance, Memory],
  unknown,
  unknown
> {
  instance: WebAssembly.Instance;
  memory: Memory;

  private constructor(
    module: WebAssembly.Module,
  ) {
    const context = new Context({
      env: {},
      args: [],
      preopens: {},
    });
    const instance = new WebAssembly.Instance(module, {
      wasi_snapshot_preview1: {
        sock_accept(fd: any, _flags: any) {
          return fd;
        },
        ...context.exports,
      },
      host: {
        callback: (id: number, ptr: number) => {
          const res = memory.decode(ptr);
          this.receive({ id, ...res });
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

    super(
      [instance, memory],
      ([instance, memory], { id, op, data }) => {
        const apply = instance.exports.apply as CallableFunction;
        apply(...memory.encode(id, op, data));
      },
      () => {},
    );
    this.instance = instance;
    this.memory = memory;
  }

  static async init(): Promise<PythonWasmMessenger> {
    if (!await exists(cachePath)) {
      const res = await fetch(pythonWasiReactorUrl);
      const archivePath = await Deno.makeTempFile({
        dir: config.tmp_dir,
      });
      const buffer = await res.arrayBuffer();
      const archive = await gunzip(new Uint8Array(buffer));
      await Deno.writeFile(archivePath, archive);
      await tar.uncompress(archivePath, config.tmp_dir);
    }

    const binary = await Deno.readFile(cachePath);
    const module = await WebAssembly.compile(binary);

    return new PythonWasmMessenger(module);
  }

  executeSync(exportName: string, ...args: unknown[]): RustResult {
    const fn = this.instance.exports[exportName] as CallableFunction | null;
    if (!fn) {
      throw new Error(`export ${exportName} not found`);
    }
    return this.memory.decode(fn(...this.memory.encode(...args)));
  }
}
