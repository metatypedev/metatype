// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, join, resolve } from "@std/path/posix";

const customDir = resolve(dirname(fromFileUrl(import.meta.url)));

export const endpoints = {
  mutation: Deno.readTextFileSync(
    join(customDir, "m.gql"),
  ),
  query: Deno.readTextFileSync(
    join(customDir, "q.graphql"),
  ),
};
