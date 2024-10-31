// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dirname } from "@std/path/dirname";
import { resolve } from "@std/path/resolve";
import { join } from "@std/path/join";
import { fromFileUrl } from "@std/path/from-file-url";

const customDir = resolve(dirname(fromFileUrl(import.meta.url)));

export const endpoints = {
  mutation: Deno.readTextFileSync(
    join(customDir, "m.gql"),
  ),
  query: Deno.readTextFileSync(
    join(customDir, "q.graphql"),
  ),
};
