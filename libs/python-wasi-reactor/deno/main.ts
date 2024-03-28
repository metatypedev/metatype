//
// deno run -A --unstable test.ts
//

import { assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { 
  apply_lambda, 
  register_virtual_machine, 
  unregister_virtual_machine, 
  register_module, apply_def, register_def
} from "../bindings/bindings.ts";

import { processOutput } from "./common.ts";

const vm_name = "test_vm";

// a VM instance will host a single python runtime instance
register_virtual_machine({
  vm_name,
  preopens: [
      "/app:./deno/python_scripts:readonly"
  ],
  pylib_path: "./vendor/libpython/usr/local/lib",
  wasi_mod_path: "./build/python-wasi-reactor.wasm",
});

processOutput(register_module({
  vm: vm_name,
  name: "my_mod",
  code: `
from module_a import even, odd
import os

def say_hello(x, y):
  return f"Hello {x} and {y}"

def basics():
  print(os.listdir("/app"))
  x = 5
  return f"{x} is even: {even(x)}"
`
}));

processOutput(register_def({
  vm: vm_name,
  name: "hey",
  code: "def hey(x):\n\treturn f'hello {x} from def'",
}));

// mod
for (let i = 0; i < 5; i++) {
  const label = `test${i}`;
  console.time(label);
  const ret = processOutput(apply_def({
    vm: vm_name,
    id: 1,
    name: "my_mod.say_hello",
    args: JSON.stringify(["John", "Jake"]),
  }));
  console.log(ret);
  console.timeEnd(label);
}

console.log(processOutput(apply_def({
  vm: vm_name,
  id: 1,
  name: "my_mod.basics",
  args: JSON.stringify([]),
})));

// def
console.log();
console.log(processOutput(apply_def({
  vm: vm_name,
  name: "hey",
  id: 1,
  args: JSON.stringify(["John"])
})));

// delete vm
console.log();
console.log("Destroying vm");
unregister_virtual_machine({vm_name});
const ret = apply_lambda({
    vm: vm_name,
    id: 1,
    name: "my_mod.say_hello",
    args: JSON.stringify(["John", "Jake"]),
});
assert((ret as any)?.["Err"]?.["message"] === "vm not initialized")
console.log("Ok");
