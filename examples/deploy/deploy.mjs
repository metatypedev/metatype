import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { tgDeploy } from "@typegraph/sdk/tg_deploy.js";

const tg = typegraph({
  name: "deploy-example-node",
  disableAutoSerialization: true // disable print
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
  cliVersion: "0.3.2",
  auth: {
    username: "admin",
    password: "password",
  },
}).then((result) => {
  console.log("gate:");
  console.log(result);
})
  .catch(console.error);
