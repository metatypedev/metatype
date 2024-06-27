// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import * as path from "path";

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";

// Your typegraph
export const tg = await typegraph("example", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose(
    {
      sayHello: deno.import(t.struct({ name: t.string() }), t.string(), {
        module: "scripts/say_hello.ts",
        name: "sayHello",
      }),
    },
    pub,
  );
});

// skip:start
const cwd = Deno.args[0];
const PORT = Deno.args[1];

// skip:end

// Configure your deployment

let baseUrl = "<TYPEGATE_URL>";
let auth = new BasicAuth("<USERNAME>", "<PASSWORD>");

// skip:start
baseUrl = `http://localhost:${PORT}`;
auth = new BasicAuth("admin", "password");
// skip: end

const config = {
  typegate: {
    url: baseUrl,
    auth: auth,
  },
  typegraphPath: path.join(cwd, "path-to-typegraph.ts"),
  prefix: "<prefx>",
  secrets: {},
  migrationsDir: path.join("prisma-migrations", tg.name),
  defaultMigrationAction: {
    create: true,
    reset: true, // allow destructive migrations
  },
};

// Deploy to typegate
const deployResult = await tgDeploy(tg, config);
console.log(deployResult);
