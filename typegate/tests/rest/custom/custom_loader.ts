// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname } from "std/path/dirname.ts";
import { resolve } from "std/path/resolve.ts";
import { join } from "std/path/join.ts";
import { fromFileUrl } from "std/path/from_file_url.ts";

function customDir(): string {
  return resolve(dirname(fromFileUrl(import.meta.url)));
}

export const endpoints = {
  mutation: Deno.readTextFileSync(
    join(customDir(), "m.gql"),
  ),
  query: Deno.readTextFileSync(
    join(customDir(), "q.graphql"),
  ),
};
