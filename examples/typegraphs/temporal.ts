import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { TemporalRuntime } from "@typegraph/sdk/providers/temporal.ts";

// skip:start
function getEnvVariable(
  key: string,
  defaultValue?: string
): string | undefined {
  const glob = globalThis as any;
  const value = glob?.process
    ? glob?.process.env?.[key]
    : glob?.Deno.env.get(key);
  return value ?? defaultValue;
}
// skip:end

typegraph(
  {
    name: "temporal",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g: any) => {
    const pub = Policy.public();
    const temporal = new TemporalRuntime({
      name: "<name>",
      hostSecret: "<host_secret>",
      namespaceSecret: "<ns_secret>",
    });

    const workflow_id = getEnvVariable("ID_FROM_ENV");
    const arg = t.struct({ some_field: t.string() });

    g.expose(
      {
        start: temporal.startWorkflow("<workflow_type>", arg),
        query: temporal.queryWorkflow("<query_type>", arg, t.string()),
        signal: temporal.signalWorkflow("<signal_name>", arg),
        describe: workflow_id
          ? temporal.describeWorkflow().reduce({ workflow_id })
          : temporal.describeWorkflow(),
      },
      pub
    );
  }
);
