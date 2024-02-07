// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { BasicAuth, tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy.js";

export const tg = typegraph({
  name: "self-deploy",
  disableAutoSerialization: true, // disable print
}, (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    test: deno.static(t.struct({ a: t.string() }), { a: "HELLO" }),
    sayHello: deno.import(
      t.struct({ name: t.string() }),
      t.string(),
      // relative to cwd
      { module: "scripts/main.ts", name: "sayHello" },
    ),
    sayHelloLambda: deno.func(
      t.struct({ name: t.string() }),
      t.string(),
      { code: "({ name }) => `Hello ${name} from deno lambda`" },
    ),
  }, pub);
});

export async function deploy(
  gate: string,
  auth: BasicAuth,
  cliVersion: string,
  dir: string,
) {
  return await tgDeploy(tg, {
    baseUrl: gate,
    cliVersion,
    auth,
    secrets: {},
    artifactsConfig: {
      prismaMigration: {
        action: {
          create: true,
          reset: false,
        },
        migrationDir: "prisma-migrations",
      },
      dir,
    },
  });
}

export function undeploy(gate: string, auth: BasicAuth) {
  return tgRemove(tg, { baseUrl: gate, auth });
}
