import { z } from "zod/mod.ts";
import { getLogger } from "./log.ts";
import "std/dotenv/load.ts";
import { deepMerge, mapKeys } from "std/collections/mod.ts";
import { parse } from "std/flags/mod.ts";

const sources = [
  { hostname: await getHostname() },
  parse(Deno.args) as Record<string, unknown>,
  mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
];

const schema = z.object({
  debug: z.preprocess(
    (a: unknown) => z.string().parse(a) === "true",
    z.boolean(),
  ),
  hostname: z.string(),
  redis_url: z
    .string()
    .url()
    .transform((s: string) => {
      const url = new URL(s);
      if (url.password === "") {
        url.password = Deno.env.get("REDIS_PASSWORD") ?? "";
      }
      return url;
    }),
  tg_host: z.string(),
  tg_port: z.preprocess(
    (a: unknown) => parseInt(z.string().parse(a), 10),
    z.number().positive().max(65535),
  ),
});

const parsing = schema.safeParse(sources.reduce((a, b) => deepMerge(a, b), {}));

if (!parsing.success) {
  getLogger().error(parsing.error);
  Deno.exit(1);
}

const { data } = parsing;

export default data;

async function getHostname() {
  try {
    const cmd = Deno.run({ cmd: ["hostname"], stdout: "piped" });
    const stdout = await cmd.output();
    cmd.close();
    return new TextDecoder().decode(stdout).trim();
  } catch (e) {
    console.debug(`cannot use hostname binary (${e.message}), fallback to env`);
    return Deno.env.get("HOSTNAME");
  }
}
