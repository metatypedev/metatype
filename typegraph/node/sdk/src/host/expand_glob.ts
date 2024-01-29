// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { dir, getRuntime } from "../deps/file_explorer.js";

export default async function (root: string): Promise<Array<string>> {
  const ret = await dir(root);
  console.log("[CONSOLE LOG]", ret);
  return ret;
}
