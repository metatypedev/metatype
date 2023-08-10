// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../../utils/mod.ts";

Meta.test("Typegraph generation with GraphQL runtime", async (t) => {
  await t.assertSameTypegraphs(
    "runtimes/graphql/typegraphs/deno/graphql.ts",
    "runtimes/graphql/typegraphs/python/graphql.py",
  );
});
