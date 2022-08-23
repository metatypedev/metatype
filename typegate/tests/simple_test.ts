import { gql, test } from "./utils.ts";

test("Simple graph", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/simple.py");

  await t.should("work", async () => {
    await gql`
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

  await t.should("work with root variables", async () => {
    await gql`
      query q($val: Int) {
        test(a: $val) {
          a
        }
      }
    `
      .withVars({
        val: 2,
      })
      .expectData({
        test: {
          a: 2,
        },
      })
      .on(e);
  });

  await t.should("reject missing variable", async () => {
    await gql`
      query q($val: Int) {
        rec(nested: { arg: $val })
      }
    `
      .expectErrorContains("missing variable")
      .on(e);
  });

  await t.should("accepted variable", async () => {
    await gql`
      query q($val: Fake) {
        rec(nested: $val)
      }
    `
      .withVars({
        val: { nested: 2 },
      })
      .expectData({
        rec: 2,
      })
      .on(e);
  });

  await t.should("accepted nested variable", async () => {
    await gql`
      query q($val: Integer) {
        rec(nested: { arg: $val })
      }
    `
      .withVars({
        val: 2,
      })
      .expectData({
        rec: 2,
      })
      .on(e);
  });
});
