import { gql, test } from "./utils.ts";

test("Random", async (t) => {
  const e = await t.pythonFile("typegraphs/random.py");

  await t.should("work", async () => {
    await gql`
      query {
        randomRec {
          uuid
          int
          str
          email
        }
      }
    `
      .expectData({
        randomRec: {
          uuid: "1069ace0-cdb1-5c1f-8193-81f53d29da35",
          int: 7457276839329792,
          str: "HPFk*o570)7",
          email: "vi@itabefir.bb",
        },
      })
      .on(e);
  });
});
