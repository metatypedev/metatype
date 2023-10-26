// console.log("runtime.js is running!");

// const { core } = Deno[Deno.internal];
const { core } = Deno;
const { ops } = core;

globalThis.runjs = {
  foobar: () => {
    return ops.op_foobar();
  },
};
