// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
// import * as path from "path";

import { BasicAuth, tgRemove } from "@typegraph/sdk/tg_deploy.js";

// Your typegraph
const tg = await typegraph("example", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose(
    {
      sayHello: deno.import(t.struct({ name: t.string() }), t.string(), {
        module: "path/to/say_hello.ts",
        name: "sayHello",
      }),
    },
    pub,
  );
});

const PORT = Deno.args[0];

// Configure your deployment

const baseUrl = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");

// const config = {
//   typegate: {
//     url: baseUrl,
//     auth: auth,
//   },
//   typegraphPath: "./deploy.mjs",
//   prefix: "<prefx>",
//   secrets: {},
//   migrationsDir: path.join("prisma-migrations", tg.name),
//   defaultMigrationAction: {
//     create: true,
//     reset: true, // allow destructive migrations
//   },
// };

// Deploy to typegate
// const deployResult = await tgDeploy(tg, config);
// console.log(deployResult);

const { typegate } = await tgRemove(tg, {
  url: baseUrl,
  auth: auth,
});

// Response from typegate
console.log(typegate);
