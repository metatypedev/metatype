import { expandGlobSync } from "./deps.ts";

export function log(message: string): void {
  // stdout is used for the typegraph
  console.error(message);
}

export function glob(pattern: string, exts: string[]): string[] {
  return Array.from(expandGlobSync(pattern)).map((f) => f.path);
}

export function readFile(path: string): string {
  return Deno.readTextFileSync(path);
}

export function writeFile(path: string, data: string): void {
  Deno.writeTextFileSync(path, data);
}
