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

type Tag = "ok" | "err";

type PythonOutput = {
  value: string; // json string
  tag: Tag;
};

function nativePythonResult(
  res: { Ok: { res?: string } } | { Err: { message: string } },
) {
  if ("Err" in res) {
    throw new Error(res.Err.message);
  }
  const ret = res.Ok?.res;
  if (ret) {
    const py = JSON.parse(ret) as PythonOutput;
    if (py.tag == "err") {
      throw new Error(py.value);
    }
    return py.value;
  }
  return null;
}

export class PythonVirtualMachine {
  #config: WasiVmInitConfig;
  #lambdas: Set<string>;

  constructor() {
    this.#config = {
      vm_name: "defaultName",
      preopens: [],
      pylib_path: "./tmp/libpython/usr/local/lib",
      wasi_mod_path: "./tmp/python-wasi-reactor.wasm",
    };
    this.#lambdas = new Set<string>();
  }

  async setup(vmName: string, appDirectoryPath: string) {
    this.#config = {
      ...this.#config,
      vm_name: vmName,
      preopens: [`/app:${appDirectoryPath}:readonly`],
    };
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
