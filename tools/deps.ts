// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// FIXME: we can't use the import map in ghjk so we must
// rely on a deps.ts

export { file } from "https://raw.githubusercontent.com/metatypedev/ghjk/v0.2.2/mod.ts";
export * from "https://raw.githubusercontent.com/metatypedev/ghjk/v0.2.2/mod.ts";
export * as ports from "https://raw.githubusercontent.com/metatypedev/ghjk/v0.2.2/ports/mod.ts";
export {
  std_url,
  zod,
} from "https://raw.githubusercontent.com/metatypedev/ghjk/v0.2.2/deps/common.ts";
export {
  copyLock,
  sedLock,
} from "https://raw.githubusercontent.com/metatypedev/ghjk/v0.2.2/std.ts";
export {
  downloadFile,
  objectHash,
} from "https://raw.githubusercontent.com/metatypedev/ghjk/v0.2.2/utils/mod.ts";
// export * from "../../ghjk/mod.ts";
// export * as ports from "../../ghjk/ports/mod.ts";
// export * as utils from "../../ghjk/utils/mod.ts";
// export { std_url, zod } from "../../ghjk/deps/common.ts";
// export { copyLock, sedLock } from "../../ghjk/std.ts";

// TODO: move to import map
export {
  basename,
  dirname,
  fromFileUrl,
  join,
  relative,
  resolve,
} from "jsr:@std/path@^1.0.2";
export { parseArgs } from "jsr:@std/cli@^1.0.3";
export {
  copySync,
  existsSync,
  expandGlob,
  expandGlobSync,
} from "jsr:@std/fs@^1.0.1";
export {
  cyan,
  dim,
  gray,
  green,
  red,
  yellow,
} from "jsr:@std/fmt@^1.0.0/colors";
export { assert } from "jsr:@std/assert@^1.0.3";
export { format as formatDuration } from "jsr:@std/fmt@^1.0.0/duration";
export { mergeReadableStreams, TextLineStream } from "jsr:@std/streams@1";
export type {} from "jsr:@std/path@^1.0.2";
export * as semver from "jsr:@std/semver@^1.0.1";
// https://github.com/hayd/deno-udd/pull/108
// export { udd } from "https://deno.land/x/udd@0.8.2/mod.ts";
export { udd } from "https://raw.githubusercontent.com/levibostian/deno-udd/ignore-prerelease/mod.ts";
export * as dnt from "https://deno.land/x/dnt@0.38.1/mod.ts";
// @deno-types="https://deno.land/x/fuse@v6.4.1/dist/fuse.d.ts"
import Fuse from "https://deno.land/x/fuse@v6.4.1/dist/fuse.esm.min.js";
export { Fuse };
import bytes from "https://deno.land/x/convert_bytes@v2.1.1/mod.ts";
export { bytes };
export * as ctrlc from "https://deno.land/x/ctrlc@0.2.1/mod.ts";

export type OrRetOf<T> = T extends () => infer Inner ? Inner : T;
// FIXME: move with `$.switchMap` once ghjk 0.3 lands
/**
 * This tries to emulate a rust `match` statement but in a typesafe
 * way. This is a WIP function.
 * ```ts
 * const pick: 2 = switchMap(
 *   "hello",
 *   {
 *     hey: () => 1,
 *     hello: () => 2,
 *     hi: 3,
 *     holla: 4,
 *   },
 * );
 * ```
 */
export function switchMap<
  K extends string | number | symbol,
  All extends {
    [Key in K]?: All[K];
  },
>( // D = undefined,
  val: K,
  branches: All,
  // def?: (val: K) => D,
): K extends keyof All ? OrRetOf<All[K]> : OrRetOf<All[keyof All]> | undefined {
  const branch = branches[val];
  return typeof branch == "function" ? branch() : branch;
}
