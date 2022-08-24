import { gql, test } from "./utils.ts";

test("GraphQL variables", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/vars.py");

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
    `.withVars({
      numbers: [1, 2, 3, 4],
    }).expectData({
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
