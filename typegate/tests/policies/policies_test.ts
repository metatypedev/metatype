// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import config from "../../src/config.ts";
import { gql, test } from "../utils.ts";

async function genSecretKey(
  typegraphName: string,
): Promise<Record<string, string>> {
  const key = await crypto.subtle.importKey(
    "raw",
    config.tg_secret.slice(32, 64),
    { name: "HMAC", hash: { name: "SHA-256" } },
    true,
    ["verify"],
  );
  const jwk = JSON.stringify(await crypto.subtle.exportKey("jwk", key));
  const envVar = `TG_${typegraphName.toUpperCase()}_NATIVE_JWT`;
  return { [envVar]: jwk };
}

test("Policies", async (t) => {
  const e = await t.pythonFile("policies/policies.py", {
    secrets: await genSecretKey("policies"),
  });

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
      .expectErrorContains("Authorization failed")
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
      .expectErrorContains("Authorization failed")
      .on(e);
  });
});

test("Role jwt policy access", async (t) => {
  const e_norm = await t.pythonFile("policies/policies_jwt.py", {
    secrets: await genSecretKey("policies_jwt"),
  });
  const e_inject = await t.pythonFile("policies/policies_jwt_injection.py", {
    secrets: await genSecretKey("policies_jwt_injection"),
  });

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
        // "__jwt_user_name_some_role in sayHelloWorld",
        "Authorization failed for policy '__jwt_user_name_some_role'",
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

test("Namespace policies", async (t) => {
  const e = await t.pythonFile("policies/policies.py", {
    secrets: await genSecretKey("policies"),
  });

  await t.should("fail when no policy", async () => {
    await gql`
      query {
        ns {
          select { id }
        }
      }
    `
      .expectErrorContains("No authorization policy")
      .on(e);
  });
});

test("Policies for effects", async (t) => {
  const e = await t.pythonFile("policies/effects.py", {
    secrets: await genSecretKey("effects"),
  });

  await t.should("succeeed", async () => {
    await gql`
      query {
        findUser(id: 12) {
          id
          email
        }
      }
    `
      .expectData({
        findUser: {
          id: 12,
          email: "john@example.com",
        },
      })
      .on(e);
  });

  await t.should("fail without authorization", async () => {
    await gql`
      mutation {
        updateUser(id: 12, set: {email: "john.doe@example.com"}) {
          id
          email
        }
      }
    `
      .expectErrorContains("Authorization failed")
      .on(e);

    await gql`
      query {
        findUser(id: 12) {
          id
          email
          password_hash
        }
      }
    `
      .expectErrorContains("Authorization failed")
      .on(e);
  });

  await t.should("should succeed with appropriate autorization", async () => {
    await gql`
      mutation {
        updateUser(id: 12, set: {email: "john.doe@example.com"}) {
          id
          email
        }
      }
    `
      .expectData({
        updateUser: {
          id: 12,
          email: "john.doe@example.com",
        },
      })
      .withContext({ role: "admin" })
      .on(e);

    await gql`
      query {
        findUser(id: 12) {
          id
          email
          password_hash
        }
      }
    `
      .expectErrorContains("Authorization failed")
      .on(e);
  });
});
