// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gunzip, tar } from "compress/mod.ts";
import { AsyncMessenger } from "../patterns/messenger/async_messenger.ts";
import config from "../../config.ts";
import { join } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";

import { PythonVirtualMachine } from "./python_vm.ts";

const pythonWasiReactorUrl =
  "https://github.com/metatypedev/python-wasi-reactor/releases/download/v0.1.0/python3.11.1-wasi-reactor.wasm.tar.gz";

const cachePath = join(config.tmp_dir, "python3.11.1-wasi-reactor.wasm");

export class PythonWasmMessenger extends AsyncMessenger<
  PythonVirtualMachine,
  unknown,
  unknown
> {
  vm: PythonVirtualMachine;

  private constructor() {
    const vm = new PythonVirtualMachine();
    super(
      vm,
      (vm, { id, op, data }) => {
        vm.apply(id, op as string, [data])
          .then((res) => {
            this.receive({ id, data: res });
          })
          .catch((err) => {
            this.receive({ id, error: err });
          });
      },
      () => {},
    );
    this.vm = vm;
  }

  static async init(): Promise<PythonWasmMessenger> {
    if (!await exists(cachePath)) {
      const res = await fetch(pythonWasiReactorUrl);
      const archivePath = await Deno.makeTempFile({
        dir: config.tmp_dir,
      });
      const buffer = await res.arrayBuffer();
      const archive = gunzip(new Uint8Array(buffer));
      await Deno.writeFile(archivePath, archive);
      await tar.uncompress(archivePath, config.tmp_dir);
    }

    return new PythonWasmMessenger();
  }
}
