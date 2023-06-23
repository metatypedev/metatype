import { dirname, fromFileUrl, resolve } from "std/path/mod.ts";

const currentDir = dirname(fromFileUrl(import.meta.url));

const target = resolve(currentDir, "../gen/typegraph_core.d.ts");

Deno.writeFileSync(
  target,
  new TextEncoder().encode(
    `import { Core } from "./exports/core.d.ts";
import { Runtimes } from "./exports/runtimes.d.ts";
export const core: typeof Core;
export const runtimes: typeof Runtimes;`,
  ),
);
