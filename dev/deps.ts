// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export {
  basename,
  dirname,
  fromFileUrl,
  join,
  resolve,
} from "https://deno.land/std@0.202.0/path/mod.ts";
export { parse as parseFlags } from "https://deno.land/std@0.202.0/flags/mod.ts";
export { expandGlobSync } from "https://deno.land/std@0.202.0/fs/mod.ts";
export { cyan, green } from "https://deno.land/std@0.202.0/fmt/colors.ts";
export {
  mergeReadableStreams,
  TextLineStream,
} from "https://deno.land/std@0.202.0/streams/mod.ts";
export { groupBy } from "https://deno.land/std@0.202.0/collections/group_by.ts";
export type { WalkEntry } from "https://deno.land/std@0.202.0/fs/mod.ts";
export * as yaml from "https://deno.land/std@0.202.0/yaml/mod.ts";
export * as semver from "https://deno.land/std@0.202.0/semver/mod.ts";

// https://github.com/hayd/deno-udd/pull/108
// export { udd } from "https://deno.land/x/udd@0.8.2/mod.ts";
export { udd } from "https://github.com/levibostian/deno-udd/raw/ignore-prerelease/mod.ts";
export * as dnt from "https://deno.land/x/dnt@0.38.1/mod.ts";
