// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, sleep, test } from "../../utils.ts";

test("Grpc runtime", async (t) => {
  const e = await t.pythonFile("runtimes/grpc/grpc.py");

  await t.should("works", async () => {
    new Deno.Command(
      "./typegate/tests/runtimes/grpc/grpc_server/start.sh",
      {
        stdout: "null",
      },
    ).spawn();

    await sleep(10 * 1000);

    await gql`
      query {
        greet(name: "Metatype")
      }
    `
      .expectData({
        greet: "Hello Metatype",
      })
      .on(e);

    const end = new Deno.Command(
      "./typegate/tests/runtimes/grpc/grpc_server/shutdown.sh",
      {
        stdout: "null",
      },
    ).spawn();

    await end.status;
  });
});
