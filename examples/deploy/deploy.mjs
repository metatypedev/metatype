import { fx, Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { tgDeploy } from "@typegraph/sdk/tg_deploy.js";

const tg = typegraph({
  name: "deploy-example",
  disableAutoSerialization: true 
}, (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    g.expose({
      test: deno.static(t.struct({ a: t.string() }), { a: "HELLO" }),
    }, pub);
  },
);

tgDeploy(tg, {
  baseUrl: "http://localhost:7890",
  auth: {
    username: "admin",
    password: "password",
  },
}).then((response) => {
  console.log("OK");
  console.log(response);
})
  .catch(console.error);
