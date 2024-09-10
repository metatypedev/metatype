// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";

Meta.test({ name: "Grpc Runtime" }, async (t) => {
  const hello_world = await t.engine("runtimes/grpc/helloworld.py");

  await t.should("Say Hello", async () => {
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
      .on(hello_world);
  });

  const maths = await t.engine("runtimes/grpc/maths.py");

  await t.should("Sum number", async () => {
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
      .on(maths);
  });

  await t.should("Prime", async () => {
    await gql`
      query {
        prime(number: 17) {
          isPrime
        }
      }
    `
      .expectData({
        prime: {
          isPrime: true,
        },
      })
      .on(maths);
  });

  const geography = await t.engine("runtimes/grpc/geography.py");

  await t.should("show Contry Demography", async () => {
    await gql`
      query {
        dem(name: "France") {
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
        dem: {
          name: "France",
          capital: "Paris",
          population: 68035000,
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
      .on(geography);
  });
});
