import { gql, test } from "./utils.ts";

test("Deno/worker runtimes", async (t) => {
  const e = await t.pythonFile("typegraphs/deno.py");

  await t.should("work on the default worker", async () => {
    await gql`
      query {
        add(first: 1.2, second: 2.3)
      }
    `
      .expectData({
        add: 3.5,
      })
      .on(e);
  });

  await t.should("work on a worker runtime", async () => {
    await gql`
      query {
        sum(numbers: [1, 2, 3, 4])
      }
    `
      .expectData({
        sum: 10,
      })
      .on(e);
  });

  await t.should("work with global variables in a module", async () => {
    await gql`
      query {
        count
      }
    `
      .expectData({
        count: 1,
      })
      .on(e);

    await gql`
      query {
        count
      }
    `
      .expectData({
        count: 2,
      })
      .on(e);
  });
});
