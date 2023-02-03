// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Policies", async (t) => {
  const e = await t.pythonFile("policies/policies.py");

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
      .withContext({ a: "2" })
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

test("Policy args", async (t) => {
  const e = await t.pythonFile("policies/policies.py");

  await t.should("pass raw args to the policy", async () => {
    await gql`
      query {
        secret(username: "User") {
          username
          data
        }
      }
    `
      .expectData({
        secret: {
          username: "User",
          data: "secret",
        },
      }).withContext({
        username: "User",
      })
      .on(e);
  });
});

test("Role jwt policy access", async (t) => {
  const e_norm = await t.pythonFile("policies/policies_jwt.py");
  const e_inject = await t.pythonFile("policies/policies_jwt_injection.py");

  await t.should("have role", async () => {
    await gql`
      query {
        sayHelloWorld
      }
    `.withContext({
      user: {
        name: "some role",
      },
    })
      .expectData({
        sayHelloWorld: "Hello World!",
      })
      .on(e_norm);
  });

  await t.should("not have a role", async () => {
    await gql`
      query {
        sayHelloWorld
      }
    `
      .expectErrorContains(
        "__jwt_user_name_some_role in sayHelloWorld",
      )
      .withContext({
        user: {
          name: "another role",
        },
      })
      .on(e_norm);
  });

  // see policies_jwt_injection.py for more context
  await t.should(
    "not have access as the typegraph policy is sanitized",
    async () => {
      await gql`
      query {
        sayHelloWorld
      }
    `
        .expectErrorContains("__jwt")
        .withContext({
          "literally": "anything",
        })
        .on(e_inject);
    },
  );
});
