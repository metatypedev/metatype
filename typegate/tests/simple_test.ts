import { gql, test } from "./utils.ts";

test("Simple graph", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/simple.py");

  await t.should("work", async () => {
    gql`
      query {
        test(a: 2) {
          a
        }
      }
    `
      .expectData({
        test: {
          a: 2,
        },
      })
      .on(e);
  });
});
