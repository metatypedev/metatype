// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { Auth } from "@typegraph/sdk/params";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random";

typegraph(
  {
    name: "policies",
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    // skip:end
    const deno = new DenoRuntime();
    const random = new RandomRuntime({ seed: 0 });
    // `public` is sugar for `(_args, _ctx) => true`
    const pub = Policy.public();

    const admin_only = deno.policy(
      "admin_only",
      // note: policies either return true | false | null
      "(args, { context }) => context.username ? context.username === 'admin' : null",
    );
    const user_only = deno.policy(
      "user_only",
      "(args, { context }) => context.username ? context.username === 'user' : null",
    );

    g.auth(Auth.basic(["admin", "user"]));

    g.expose(
      {
        public: random.gen(t.string()).withPolicy(pub),
        admin_only: random.gen(t.string()).withPolicy(admin_only),
        user_only: random.gen(t.string()).withPolicy(user_only),
        // if both attached policies return null, access is denied
        both: random.gen(t.string()).withPolicy([user_only, admin_only]),
        // set default policy for the exposed functions
      },
      pub,
    );
    // skip:start
  },
);
// skip:end
