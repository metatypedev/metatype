// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

/* eslint-disable  @typescript-eslint/no-explicit-any */

function getEnvOrDefault(key: string, defaultValue: string) {
  const glob = globalThis as any;
  const value = glob?.process
    ? glob?.process.env?.[key]
    : glob?.Deno.env.get(key);
  return value ?? defaultValue;
}
// skip:end

typegraph({
  name: "iam-provider",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  g.auth(Auth.oauth2Github("openid profile email"));

  const pub = Policy.public();

  const deno = new DenoRuntime();
  const host = getEnvOrDefault("TG_URL", "http://localhost:7890");
  const url = `${host}/iam-provider/auth/github?redirect_uri=${
    encodeURIComponent(host)
  }`;

  g.expose({
    loginUrl: deno.static(t.string(), url),
    logoutUrl: deno.static(t.string(), `${url}&clear`),
    context: deno.func(
      t.struct({}),
      t.struct({ "username": t.string() }).optional(),
      {
        code:
          "(_, { context }) => Object.keys(context).length === 0 ? null : context",
      },
    ),
  }, pub);
});
