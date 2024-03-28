import { 
  apply_lambda, 
  register_virtual_machine, 
  register_lambda,
} from "../bindings/bindings.ts";
  

function promisify<T>(fn: CallableFunction): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      resolve(Promise.resolve(fn()));
    } catch (e) {
      reject(e);
    }
  });
}

const vmName = "myVm";
console.time("vmInit");
await promisify(() => register_virtual_machine({
  vm_name: vmName,
  preopens: [
    "/app:./deno/python_scripts:readonly"
  ],
  pylib_path: "./vendor/libpython/usr/local/lib",
  wasi_mod_path: "./build/python-wasi-reactor.wasm",
}));
console.timeEnd("vmInit");

await promisify(() => register_lambda({
  name: "id",
  code: "lambda x: x['a']",
  vm: vmName
}));

const all = [...new Array(100)].map((_, n) => {
  return promisify(() => apply_lambda({
    id: n,
    vm: vmName,
    name: "id",
    args: JSON.stringify([{a: "test"}])
  }));
});

console.time("100 parallel");
await Promise.all(all);
console.timeEnd("100 parallel");

console.time("100 sequential");
for (let i = 0; i < 100; i++) {
  await promisify(() => apply_lambda({
    id: i,
    vm: "myVm",
    name: "id",
    args: JSON.stringify([{a: "test"}])
  }));
}
console.timeEnd("100 sequential");
