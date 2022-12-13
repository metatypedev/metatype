// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { test } from "./utils.ts";

test("GraphQL parser", async (t) => {
  const e = await t.pythonFile("typegraphs/graphql.py");
  /**
   * Types from the parsed TypeGraph
   */
  const types = e.tg.tg.types;
  t.assertSnapshot(types);
});
