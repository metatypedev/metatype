// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

// skip:end

typegraph({
  name: "policies",
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const deno = new DenoRuntime();
  const random = new RandomRuntime({ seed: 0 });
  const pub = Policy.public();

  const admin_only = deno.policy(
    "admin_only",
    "(args, { context }) => context.username ? context.username === 'admin' : null",
  );
  const user_only = deno.policy(
    "user_only",
    "(args, { context }) => context.username ? context.username === 'user' : null",
  );

  g.auth(Auth.basic(["admin", "user"]));

  g.expose({
    public: random.gen(t.string()).withPolicy(pub),
    admin_only: random.gen(t.string()).withPolicy(admin_only),
    user_only: random.gen(t.string()).withPolicy(user_only),
    both: random.gen(t.string()).withPolicy([user_only, admin_only]),
  });
});
