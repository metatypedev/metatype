import { dirname, fromFileUrl } from "std/path/mod.ts";

export const testDir = dirname(fromFileUrl(import.meta.url));
