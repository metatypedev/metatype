// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Server } from "std/http/server.ts";
import { execute, gql, test } from "../utils.ts";

test("Internal test", async (t) => {
  const e = await t.pythonFile("internal/internal.py");

  await t.should("work on the default worker", async () => {
    const port = 7895;
    const server = new Server({
      port,
      hostname: "localhost",
      handler: (req: Request) => execute(e, req),
    });
    const listner = server.listenAndServe();
    await gql`
      query {
        remoteSum(first: 1.2, second: 2.3)
      }
    `
      .expectData({
        remoteSum: 3.5,
      })
      .on(e, `http://localhost:${port}`);

    server.close();
    await listner;
  });
});
