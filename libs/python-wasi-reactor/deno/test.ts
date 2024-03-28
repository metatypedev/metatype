import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { 
  processOutput, 
} from "./common.ts";

import {
  register_virtual_machine,

  register_lambda,                 
  apply_lambda,

  register_def,
  apply_def,

  register_module,
} from "../bindings/bindings.ts"


const vm_name = "test_vm";

register_virtual_machine({
  vm_name,
  preopens: [
      "/app:./deno/python_scripts:readonly"
  ],
  pylib_path: "./vendor/libpython/usr/local/lib",
  wasi_mod_path: "./build/python-wasi-reactor.wasm",
});

Deno.test("wasm bindings", async (t) => {
  await t.step("lambda function", () => {
    processOutput(register_lambda({
      vm: vm_name, 
      name: "hello", 
      code: 'lambda x: f"hello{x}"'
    }));

    const ret = processOutput(apply_lambda({
      vm: vm_name, 
      id: 0, 
      name: "hello", 
      args: JSON.stringify([1234])
    }))

    assertEquals(ret, '"hello1234"');
  });

  await t.step("def function", () => {
    processOutput(register_def({
      vm: vm_name,
      name: "add",
      code: 'def add(x, y, z):\n\treturn x + y + z',
    }));
    
    const ret = processOutput(apply_def({
      vm: vm_name,
      id: 0,
      name: "add",
      args: JSON.stringify([1, 2, 3])
    }))

    assertEquals(ret, "6");
  });

  await t.step("module", () => {
    // mod_a
    processOutput(register_module({
      vm: vm_name,
      name: "mod_a",
      code: 'say_hello_a = lambda x: f"Hello {x} from A"',
    }));

    // mod_b
    processOutput(register_module({
      vm: vm_name,
      name: "mod_b",
      code: `
def say_hello_b(x):
  return f"Hello {x} from B"
      `,
    }));

    // mod_main
    processOutput(register_module({
      vm: vm_name,
      name: "mod_main",
      code: `
from mod_a import say_hello_a  # dynamic
from mod_b import say_hello_b  # dynamic
from defun import concat_two  # preopens

def go():
  return concat_two(
    say_hello_a("Jake") + "\\n",
    say_hello_b("John")
  )
`,
    }));

    const ret = processOutput(apply_def({
      vm: vm_name,
      id: 0,
      name: "mod_main.go",
      args: JSON.stringify([])
    }))

    assertEquals(
      ret,
      '"Hello Jake from A\\nHello John from B"',
    );
  });
});
