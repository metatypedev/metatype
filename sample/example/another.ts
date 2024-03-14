import { Policy, t, typegraph } from "../../typegraph/node/sdk/dist/index.js";
import { DenoRuntime } from "../../typegraph/node/sdk/dist/runtimes/deno.js";

await typegraph({
  name: "another",
}, (g: any) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();
  g.expose({
    multiply: deno
      .func(t.struct({ first: t.float(), second: t.float() }), t.float(), {
        code: "({first, second}) => first * second",
      })
      .withPolicy(pub),
  });
});
