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
  WasiVmSetupOut,
} from "native";

import { getLogger } from "../../log.ts";
const logger = getLogger(import.meta);

import config from "../../config.ts";
import { gunzip, tar } from "compress/mod.ts";
import { join } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";

type Tag = "ok" | "err";
type NativeWasiOutput = { Ok: { res?: string } } | { Err: { message: string } };
type PythonOutput = {
  value: string; // json string
  tag: Tag;
};

function nativePythonResult(
  res: NativeWasiOutput | WasiVmSetupOut,
) {
  if (res == "Ok") {
    return null;
  }
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

const pythonWasiReactorUrl =
  "https://github.com/metatypedev/python-wasi-reactor/releases/download/v0.2.0/python3.11.1-wasi-reactor.wasm.tar.gz";
const cachePathReactor = join(config.tmp_dir, "python3.11.1-wasi-reactor.wasm");

const libPythonUrl =
  "https://github.com/vmware-labs/webassembly-language-runtimes/releases/download/python%2F3.11.4%2B20230714-11be424/libpython-3.11.4-wasi-sdk-20.0.tar.gz";
const cachePathLibPython = join(config.tmp_dir, "libpython");

async function download(url: string, innerDir?: string) {
  const res = await fetch(url);
  const archivePath = await Deno.makeTempFile({
    dir: config.tmp_dir,
  });
  const buffer = await res.arrayBuffer();
  const archive = gunzip(new Uint8Array(buffer));
  await Deno.writeFile(archivePath, archive);

  const destDir = innerDir ? join(config.tmp_dir, innerDir) : config.tmp_dir;
  await tar.uncompress(archivePath, destDir);
}

export class PythonVirtualMachine {
  #config: WasiVmInitConfig;
  #lambdas: Set<string>;

  constructor() {
    this.#config = {
      vm_name: "defaultName",
      preopens: [],
      pylib_path: join(config.tmp_dir, "libpython/usr/local/lib"),
      wasi_mod_path: join(config.tmp_dir, "python3.11.1-wasi-reactor.wasm"),
    };
    this.#lambdas = new Set<string>();
  }

  async setup(vmName: string, appDirectoryPath?: string) {
    if (!await exists(cachePathReactor)) {
      logger.info(`downloading ${pythonWasiReactorUrl}`);
      await download(pythonWasiReactorUrl);
    }
    if (!await exists(cachePathLibPython)) {
      logger.info(`downloading ${libPythonUrl}`);
      await download(libPythonUrl, "libpython");
    }

    const preopens = [];
    if (appDirectoryPath) {
      preopens.push(`/app:${appDirectoryPath}:readonly`);
    }
    this.#config = {
      ...this.#config,
      preopens,
      vm_name: vmName,
    };
    nativePythonResult(
      await promisify(() => register_virtual_machine(this.#config)),
    );
  }

  async destroy() {
    nativePythonResult(
      await promisify(() =>
        unregister_virtual_machine({
          vm_name: this.getVmName(),
        })
      ),
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
    // Notes:
    // 1. if #[deno_bindgen], apply* runs on main thread => blocking
    // 2. if #[deno], apply* runs on main separate thread? => still blocking
    // alternative solution:
    // timeout at wasm level
    if (this.#lambdas.has(name)) {
      return await this.applyLambda(id, name, args);
    }
    return await this.applyDef(id, name, args);
  }
}
