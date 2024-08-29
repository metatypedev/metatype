// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoTaskDefArgs } from "./deps.ts";

const DOCKER_CMD = Deno.env.get("DOCKER_CMD") ?? "docker";

const tasks: Record<string, DenoTaskDefArgs> = {
  dev: {
    desc: "Execute dev/*.ts scripts.",
    async fn($) {
      if ($.argv.length == 0) {
        $.log("Usage: dev <dev-script-name> [args...]");
        return;
      }
      const [cmd, ...args] = $.argv;
      const script = $.workingDir.join(`dev/${cmd}.ts`);
      $.logStep(`Running ${script}`, args);
      await $`deno run --allow-all ${script} ${args}`;
    },
  },

  "dev-compose": {
    desc: "Wrapper around docker compose to manage runtime dependencies",
    async fn($) {
      const dcs = await Array.fromAsync(
        $.workingDir.join("dev/envs").expandGlob("compose.*.yml", {
          includeDirs: false,
          globstar: true,
        }),
      );
      const files = Object.fromEntries(
        dcs.map((e) => [e.path.basename().split(".")[1], e.path]),
      );

      const on = new Set<string>();
      if ($.argv.length === 1 && $.argv[0] === "all") {
        Object.values(files).forEach((e) => on.add(e.toString()));
      } else {
        for (const arg of $.argv) {
          if (!files[arg]) {
            console.log(
              `Unknown env "${arg}", available: ${
                Object.keys(files).join(
                  ", ",
                )
              } or "all".`,
            );
            Deno.exit(1);
          }
          on.add(files[arg].toString());
        }
      }

      if (on.size > 0) {
        await $.raw`${DOCKER_CMD} compose ${
          [...on].flatMap((file) => [
            "-f",
            file,
          ])
        } up -d --remove-orphans`;
      } else {
        await $.raw`${DOCKER_CMD} compose ${
          Object.values(files).flatMap((file) => [
            "-f",
            file,
          ])
        } down --remove-orphans --volumes`;
      }
    },
  },

  "dev-eg-tgraphs": {
    desc: "meta dev example/typegraphs",
    inherit: ["_rust", "_ecma", "_python"],
    fn: ($) =>
      $`cargo run -p meta-cli -- -C examples/typegraphs dev --run-destructive-migrations`,
  },

  "dev-gate1": {
    desc: "Launch the typegate in single-instance mode.",
    inherit: "_rust",
    vars: {
      PACKAGED: "false",
      LOG_LEVEL: "DEBUG",
      DEBUG: "true",
      REDIS_URL: "redis://:password@localhost:6379/0",
      TG_SECRET:
        "a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==",
      TG_ADMIN_PASSWORD: "password",
      TG_PORT: "7891",
    },
    fn: ($) => $`cargo run -p typegate`,
  },

  "dev-gate2": {
    desc: "Launch the typegate in sync mode.",
    inherit: "dev-gate1",
    vars: {
      SYNC_ENABLED: "true",
      SYNC_REDIS_URL: "redis://localhost:6379/0",
      SYNC_REDIS_PASSWORD: "password",
      SYNC_S3_HOST: "http://localhost:9000",
      SYNC_S3_REGION: "local",
      SYNC_S3_ACCESS_KEY: "minio",
      SYNC_S3_SECRET_KEY: "password",
      SYNC_S3_BUCKET: "gate2",
      TG_PORT: "7892",
    },
    fn: ($) => $`cargo run -p typegate`,
  },

  "dev-gate3": {
    desc: "Launch the typegate from a locally found meta bin.",
    inherit: "dev-gate1",
    fn: ($) => $`meta dev`,
  },

  "dev-gate4": {
    desc: "Launch the typegate from the locally built typegate image.",
    inherit: "dev-gate1",
    fn: ($) =>
      $`docker run --rm -it
        --network=host
        -e TG_PORT=7891
        -e PACKAGED=false
        -e LOG_LEVEL=DEBUG
        -e DEBUG=true
        -e REDIS_URL=redis://:password@localhost:6379/0
        -e TG_SECRET=a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==
        -e TG_ADMIN_PASSWORD=password
        typegate:latest
    `,
  },

  "dev-gate5": {
    desc: "Launch the typegate from the latests published image.",
    inherit: "dev-gate1",
    fn: ($) =>
      $`docker run --rm -it
        --network=host
        -p 7891:7891
        -e TG_PORT=7891
        -e PACKAGED=false
        -e LOG_LEVEL=DEBUG
        -e DEBUG=true
        -e REDIS_URL=redis://:password@localhost:6379/0
        -e TG_SECRET=a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==
        -e TG_ADMIN_PASSWORD=password
        ghcr.io/metatypedev/typegate:latest
    `,
  },

  "dev-website": {
    desc: "Launch the website",
    inherit: ["_ecma", "_python"],
    workingDir: "./website",
    vars: {
      TG_URL: "http://localhost:7890",
    },
    fn: ($) => $`pnpm start --no-open`,
  },
};
export default tasks;
