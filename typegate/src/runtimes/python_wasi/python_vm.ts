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
type NativeWasiOutput = { Ok: { res?: string } } | { Err: { message: string } };
type PythonOutput = {
  value: string; // json string
  tag: Tag;
};

function nativePythonResult(
  res: NativeWasiOutput,
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

function promisify<T>(fn: CallableFunction): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      resolve(fn());
    } catch (e) {
      reject(e);
    }
  });
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

  async setup(vmName: string, appDirectoryPath?: string) {
    const preopens = [];
    if (appDirectoryPath) {
      preopens.push(`/app:${appDirectoryPath}:readonly`);
    }
    this.#config = {
      ...this.#config,
      preopens,
      vm_name: vmName,
    };
    await promisify(() => register_virtual_machine(this.#config));
  }

  async destroy() {
    await promisify(() =>
      unregister_virtual_machine({
        vm_name: this.getVmName(),
      })
    );
    this.#lambdas.clear();
  }

  getVmName() {
    return this.#config.vm_name;
  }

  async registerLambda(name: string, code: string) {
    nativePythonResult(
      await promisify(() =>
        register_lambda({
          name,
          code,
          vm: this.getVmName(),
        })
      ),
    );
    this.#lambdas.add(name);
  }

  async registerDef(name: string, code: string) {
    nativePythonResult(
      await promisify(() =>
        register_def({
          name,
          code,
          vm: this.getVmName(),
        })
      ),
    );
  }

  async registerModule(name: string, code: string) {
    nativePythonResult(
      await promisify(() =>
        register_module({
          name,
          code,
          vm: this.getVmName(),
        })
      ),
    );
  }

  async applyLambda(id: number, name: string, args: unknown[]) {
    const pyRet = nativePythonResult(
      await promisify(() =>
        apply_lambda({
          id,
          name,
          args: JSON.stringify(args),
          vm: this.getVmName(),
        })
      ),
    );
    return JSON.parse(pyRet ?? "null");
  }

  async applyDef(id: number, name: string, args: unknown[]) {
    const pyRet = nativePythonResult(
      await promisify(() =>
        apply_def({
          id,
          name,
          args: JSON.stringify(args),
          vm: this.getVmName(),
        })
      ),
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
