// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta, rest } from "../utils/mod.ts";

Meta.test("Rest queries in Python", async (t) => {
  const e = await t.pythonFile("rest/custom.py");

  await t.should("work with simple request", async () => {
    await rest.get("ping")
      .expectData({
        ping: 1,
      })
      .on(e);
  });
});

Meta.test("Rest queries in Deno", async (t) => {
  const e = await t.pythonFile("rest/rest.ts");

  await t.should("work with simple request", async () => {
    await rest.get("get_post_id?id=1")
      .expectData({
        postFromUser: {
          id: 12,
        },
      })
      .on(e);

    await rest.get("get_post_id")
      .expectData({
        postFromUser: {
          id: 12,
        },
      })
      .withVars({ id: 1 })
      .on(e);
  });
});
