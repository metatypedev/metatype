import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph("injection-example", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    get_injected: deno.func(
      t.struct({
        static_value: t.integer().set(12),
        context_value: t.uuid().fromContext("profile.userId"),
        secret_value: t.string().fromSecret("secret_name"),
        dynamic_value: t.datetime().inject("now"),
      }).rename("Input"),
      t.struct({
        static_value: t.integer().rename("Static"),
        context_value: t.uuid(),
        secret_value: t.string(),
        nested: deno.identity(
          t.struct({
            parent_value: t.integer().fromParent("Static"),
          }),
        ),
        dynamic_value: t.datetime(),
      }).rename("Output"),
      {
        code: (
          { static_value, context_value, secret_value, dynamic_value },
        ) => ({ static_value, context_value, secret_value, dynamic_value }),
      },
    ).withPolicy(pub),
  });
});