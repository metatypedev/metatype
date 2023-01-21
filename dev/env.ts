import { expandGlobSync } from "https://deno.land/std@0.170.0/fs/expand_glob.ts";
import * as path from "https://deno.land/std@0.170.0/path/mod.ts";

/**
 * Wrapper around docker compose to manage runtime dependencies.
 *
 * Usage: deno run -A env.ts [<dependency1>... <dependencyN>]
 *
 * <dependency>:
 *    name of the docker-compose file / runtime dependency
 */

const dcs = Array.from(
  expandGlobSync(new URL("envs/docker-compose.*.yml", import.meta.url), {
    includeDirs: false,
  }),
);
const envs = Object.fromEntries(
  dcs
    .map((e) => [path.basename(e.path).split(".")[1], e.path]),
);

const on = new Set<string>();
if (Deno.args.length === 1 && Deno.args[0] === "all") {
  Object.values(envs).forEach(on.add);
} else {
  for (const arg of Deno.args) {
    if (!envs[arg]) {
      console.log(
        `Unknown env "${arg}", available: ${
          Object.keys(envs).join(", ")
        } or "all".`,
      );
      Deno.exit(1);
    }
    on.add(envs[arg]);
  }
}

if (on.size > 0) {
  await run([
    "docker-compose",
    ...Array.from(on).flatMap((f) => ["-f", f]),
    "up",
    "-d",
    "--remove-orphans",
  ]);
} else {
  await run([
    "docker-compose",
    ...Object.values(envs).flatMap((f) => ["-f", f]),
    "down",
    "--remove-orphans",
  ]);
}

async function run(cmd: string[]) {
  const p = Deno.run({
    cmd,
    stdout: "piped",
  });
  const stdout = await p.output();
  p.close();
  return new TextDecoder().decode(stdout).trim();
}
