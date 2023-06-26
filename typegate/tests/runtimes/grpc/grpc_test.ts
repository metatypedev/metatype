// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, sleep, test } from "../../utils.ts";

const withMockServer = async (test: () => Promise<void>) => {
  const setup = new Deno.Command(
    "./typegate/tests/runtimes/grpc/grpc_server/setup.sh",
    {
      stdout: "null",
    },
  ).spawn();

  await setup.status;

  new Deno.Command("./typegate/tests/runtimes/grpc/grpc_server/start.sh", {
    stdout: "null",
  }).spawn();

  await sleep(7 * 1000);

  // before

  await test();

  // after

  const end = new Deno.Command(
    "./typegate/tests/runtimes/grpc/grpc_server/shutdown.sh",
    {
      stdout: "null",
    },
  ).spawn();

  await end.status;
};

test("Grpc runtime", async (t) => {
  const e = await t.pythonFile("runtimes/grpc/grpc.py");

  await withMockServer(async () => {
    await t.should("work with variables", async () => {
      await gql`
        query {
          greet(name: "Metatype") {
            message
          }
        }
      `
        .expectData({
          greet: {
            message: "Hello Metatype",
          },
        })
        .on(e);
    });

    await t.should("work with arguments of list of values", async () => {
      await gql`
        query {
          sum(list: [1, 2, 3, 4, 5]) {
            total
          }
        }
      `
        .expectData({
          sum: {
            total: 15,
          },
        })
        .on(e);
    });

    await t.should("work with nested objects", async () => {
      await gql`
        query {
          country(name: "France") {
            name
            capital
            population
            currencies {
							code
							name
							symbol
						}
          }
        }
      `
        .expectData({
          country: {
            name: "France",
            capital: "Paris",
            population: 68_035_000,
            currencies: [
              {
                code: "EUR",
                name: "Euro",
                symbol: "€",
              },
              {
                code: "XPF",
                name: "CFP franc",
                symbol: "F",
              },
            ],
          },
        })
        .on(e);
    });

    await t.should("work with booleans", async () => {
      await gql`
        query {
          is_prime(number: 17) {
            isPrime
          }
        }
      `
        .expectData({
          is_prime: {
            isPrime: true,
          },
        })
        .on(e);
    });
  });
});
