# Python WASI reactor

> Python WASI reactor is part of the
> [Metatype ecosystem](https://github.com/metatypedev/metatype). Consider
> checking out how this component integrates with the whole ecosystem and browse
> the
> [documentation](https://metatype.dev?utm_source=github&utm_medium=readme&utm_campaign=python-wasi-reactor)
> to see more examples.

<details>
  <summary>What is WASM/WASI?</summary>

WebAssembly System Interface (WASI) is a standard interface for interacting with
system resources from WebAssembly (WASM) modules, providing a secure and
portable way to access low-level operating system functions.

</details>

This repository builds on the top of
[webassembly-language-runtimes](https://github.com/vmware-labs/webassembly-language-runtimes)
to provide a WASI Python runtime in reactor mode. In a reactor, the WASM guest
instance remains alive and and reacts to events from the host
([learn more](https://github.com/bytecodealliance/wasmtime/blob/main/docs/WASI-rationale.md#why-not-async)).

The runtime exports the following WASM exports:

- `init()`: intialize Python and load plugin library
- `register_lambda(name: String, code: String)`: register Python lambda code with a name
- `unregister_lambda(name: String)`: unregister given lambda
- `apply_lambda(id: i32, name: String, args: String)`: run the given lambda with a run id
  number and its argument (JSON decoded before being passed to the lambda)
- `register_def(name: String, code: String)`: register Python function with a name
- `unregister_def(name: String)`: unregister given function
- `apply_def(id: i32, name: String, args: String)`: run the given function with a run id
  number and its argument (JSON decoded before being passed to the function)
- `register_module(name: String, code: String)`: register Python code as a module with a name
- `unregister_module(name: String)`: unregister given module

It will also require the following imports:

- `callback(id: i32, value: i32)`: async return of apply with id and pointer to
  result

This is **experimental** and might not work as expected. Please report any
[issues](https://github.com/metatypedev/python-wasi-reactor/issues) you find or
[contribute](https://github.com/metatypedev/python-wasi-reactor/issues) back
improving the runtime.

## Getting started

[Wasmedge-bindgen](https://github.com/second-state/wasmedge-bindgen) has been
chosen over [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) because of
its focus on the Rust/WASM ecosystem and the support of the CNCF.
[Wit-bindgen](https://github.com/bytecodealliance/wit-bindgen) may also be
interesting to consider in the future.

### Deno host

[Deno](https://github.com/denoland/deno_std/blob/main/wasi/snapshot_preview1.ts)
does not yet provide a full implentation of WASI, yet the building blocks are
enough to run some workloads.

```bash
# increase stack size might be required on some cases: --v8-flags=--stack_size=3000
deno run -A --unstable deno/main.ts
```

### WasmEdge host

[WasmEdge](https://github.com/WasmEdge/WasmEdge) has a custom implementation of
socket WASI API, which is not yet compatible with the project. The example will
be reworked once WasmEdge 0.12 will be
[released](https://github.com/WasmEdge/WasmEdge/issues/2056).

```bash
export DYLD_LIBRARY_PATH="$HOME/.wasmedge/lib:$DYLD_LIBRARY_PATH" # macOS
export LD_LIBRARY_PATH="$HOME/.wasmedge/lib:$LD_LIBRARY_PATH" # Linux
cargo run -p wasmedge
```

## Development

Install [Whiz](https://github.com/zifeo/whiz) or manually run.

```bash
# build wasi binary (guest)
./dev/install.sh
./dev/build.sh
# enable optimization and compression
./build.sh --release


# wasmedge (host)
cargo run -p wasmedge
```

Install Deno bindgen
```
deno install -Afrq -n deno_bindgen https://deno.land/x/deno_bindgen/cli.ts
```

Testing
```
deno test -A --unstable deno/test.ts
```
