// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";
import { join } from "@std/path/join";
import { assertEquals } from "@std/assert";

Meta.test("fdk table suite", async (_t) => {
  const scriptsPath = join(import.meta.dirname!, ".");

  assertEquals(
    (
      await Meta.cli(
        {
          env: {
            // RUST_BACKTRACE: "1",
          },
        },
        ...`-C ${scriptsPath} gen`.split(" "),
      )
    ).code,
    0,
  );
});

Meta.test(
  {
    name: "Internal test",
  },
  async (t) => {
    const e = await t.engine("internal/internal.py");

    await t.should("work on the default worker", async () => {
      await gql`
        query {
          remoteSumDeno(first: 1.2, second: 2.3)
        }
      `
        .expectData({
          remoteSumDeno: 3.5,
        })
        .on(e, `http://localhost:${t.port}`);
    });

    await t.should("hostcall python work", async () => {
      await gql`
        query {
          remoteSumPy(first: 1.2, second: 2.3)
        }
      `
        .expectData({
          remoteSumPy: 3.5,
        })
        .on(e, `http://localhost:${t.port}`);
    });
  },
);
