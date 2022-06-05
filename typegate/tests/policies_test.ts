import { gql, test } from "./utils.ts";

test("Policies", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/policies.py");

  await t.should("have public access", async () => {
    await gql`
      query {
        pol_true(a: 1) {
          a
        }
      }
    `
      .expectData({
        pol_true: {
          a: 1,
        },
      })
      .on(e);
  });

  await t.should("have no access", async () => {
    await gql`
      query {
        pol_false(a: 1) {
          a
        }
      }
    `
      .expectErrorContains("authorization failed")
      .on(e);
  });

  await t.should("have access with correct value", async () => {
    await gql`
      query {
        pol_two(a: 3) {
          a
        }
      }
    `
      .withHeaders({ a: "2" })
      .expectData({
        pol_two: {
          a: 3,
        },
      })
      .on(e);
  });

  await t.should("have no access with incorrect value", async () => {
    await gql`
      query {
        pol_two(a: 1) {
          a
        }
      }
    `
      .expectErrorContains("authorization failed")
      .on(e);
  });
});
