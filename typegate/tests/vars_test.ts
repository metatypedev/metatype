// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "./utils.ts";

test("GraphQL variables", async (t) => {
  const e = await t.pythonFile("typegraphs/vars.py");

  await t.should("work with root vars", async () => {
    await gql`
      query Add($first: Int!, $second: Int!) {
        add(first: $first, second: $second)
      }
    `
      .withVars({
        first: 2,
        second: 3,
      })
      .expectData({
        add: 5,
      })
      .on(e);

    await gql`
      query Sum($numbers: [Int]!) {
        sum(numbers: $numbers)
      }
    `
      .withVars({
        numbers: [1, 2, 3, 4],
      })
      .expectData({
        sum: 10,
      })
      .on(e);
  });

  await t.should("work with nested vars in array", async () => {
    await gql`
      query Sum($first: Int!, $second: Int!) {
        sum(numbers: [$first, $second])
      }
    `
      .withVars({
        first: 2,
        second: 3,
      })
      .expectData({
        sum: 5,
      })
      .on(e);
  });
});

test("GraphQL variable types", async (t) => {
  const e = await t.pythonFile("typegraphs/vars.py");

  await t.should("reject invalid types", async () => {
    await gql`
      query Add($first: Int!, $second: Int!) {
        add(first: $first, second: $second)
      }
    `
      .withVars({
        first: 2,
        second: "3",
      })
      .expectErrorContains("variable second")
      .on(e);
  });

  await t.should("reject nested invalid types", async () => {
    await gql`
      query Sum($numbers: [Int]!) {
        sum(numbers: $numbers)
      }
    `
      .withVars({
        numbers: [1, 4, "5"],
      })
      .expectErrorContains("variable numbers[2]")
      .on(e);

    await gql`
      query Q($val: Level1!) {
        level2(level1: $val)
      }
    `
      .withVars({
        val: {
          level2: 2,
        },
      })
      .expectErrorContains("variable val.level2")
      .on(e);

    await gql`
      query Q($val: Level1!) {
        level2(level1: $val)
      }
    `
      .withVars({
        val: {
          level2: ["hello", ["world"]],
        },
      })
      .expectErrorContains("variable val.level2[1]")
      .on(e);
  });
});
