// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  apply_def,
  apply_lambda,
  register_def,
  register_lambda,
  register_module,
  register_virtual_machine,
  unregister_virtual_machine,
  WasiVmInitConfig,
} from "native";
import { nativePythonResult } from "../../tmp/common.ts";

export class PythonVirtualMachine {
  #config: WasiVmInitConfig;
  #lambdas: Set<string>;

  constructor(
    vm: string,
    appDirectoryPath: string,
  ) {
    this.#config = {
      vm_name: vm,
      preopens: [
        `/app:${appDirectoryPath}:readonly`,
      ],
      pylib_path: "./tmp/libpython/usr/local/lib",
      wasi_mod_path: "./tmp/python-wasi-reactor.wasm",
    };
    this.#lambdas = new Set<string>();
  }

  async setup() {
    await register_virtual_machine(this.#config);
  }

  async destroy() {
    await unregister_virtual_machine({
      vm_name: this.getVmName(),
    });
    this.#lambdas.clear();
  }

  getVmName() {
    return this.#config.vm_name;
  }

  async registerLambda(name: string, code: string) {
    nativePythonResult(
      await register_lambda({
        name,
        code,
        vm: this.getVmName(),
      }),
    );
    this.#lambdas.add(name);
  }

  async registerDef(name: string, code: string) {
    nativePythonResult(
      await register_def({
        name,
        code,
        vm: this.getVmName(),
      }),
    );
  }

  async registerModule(name: string, code: string) {
    nativePythonResult(
      await register_module({
        name,
        code,
        vm: this.getVmName(),
      }),
    );
  }

  async applyLambda(id: number, name: string, args: unknown[]) {
    const pyRet = nativePythonResult(
      await apply_lambda({
        id,
        name,
        args: JSON.stringify(args),
        vm: this.getVmName(),
      }),
    );
    return JSON.parse(pyRet ?? "null");
  }

  async applyDef(id: number, name: string, args: unknown[]) {
    const pyRet = nativePythonResult(
      await apply_def({
        id,
        name,
        args: JSON.stringify(args),
        vm: this.getVmName(),
      }),
    );
    return JSON.parse(pyRet ?? "null");
  }

  async apply(id: number, name: string, args: unknown[]) {
    if (this.#lambdas.has(name)) {
      return await this.applyLambda(id, name, args);
    }
    return await this.applyDef(id, name, args);
  }
}
