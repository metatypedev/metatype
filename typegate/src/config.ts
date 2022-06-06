import { z } from "https://deno.land/x/zod@v3.14.4/mod.ts";
import { getLogger } from "./log.ts";
import "std/dotenv/load.ts";
import { deepMerge, mapKeys } from "std/collections/mod.ts";
import { parse } from "std/flags/mod.ts";

const sources = [
  { hostname: await getHostname(), version: "dev" },
  parse(Deno.args) as Record<string, unknown>,
  mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
];

const schema = z.object({
  debug: z.preprocess((a) => z.string().parse(a) === "true", z.boolean()),
  hostname: z.string(),
  redis_url: z
    .string()
    .url()
    .transform((s) => new URL(s)),
  tg_host: z.string(),
  tg_port: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive().max(65535),
  ),
  version: z.string(),
});

const parsing = schema.safeParse(sources.reduce((a, b) => deepMerge(a, b), {}));

if (!parsing.success) {
  getLogger().error(parsing.error);
  Deno.exit(1);
}

const { data } = parsing;

export default data;

async function getHostname() {
  const cmd = Deno.run({ cmd: ["hostname"], stdout: "piped" });
  const stdout = await cmd.output();
  cmd.close();
  return new TextDecoder().decode(stdout).trim();
}

await getHostname();
