// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dropSchema } from "test-utils/database.ts";
import { gql, Meta } from "../utils/mod.ts";

const secrets = {
  POSTGRES: "postgresql://postgres:password@localhost:5432/db?schema=typename",
};

Meta.test("Typename", async (t) => {
  const e = await t.engine("typename/typename.py", { secrets });

  await t.should("allow querying typename at root level", async () => {
    await gql`
      query {
        __typename
      }
    `
      .expectData({
        __typename: "Query",
      })
      .on(e);
  });
});

Meta.test("Typename in deno runtime", async (t) => {
  const e = await t.engine("typename/typename.py", { secrets });

  await t.should("allow querying typename in an object", async () => {
    await gql`
      query {
        denoUser {
          __typename
        }
      }
    `
      .expectData({
        denoUser: {
          __typename: "user",
        },
      })
      .on(e);
  });
});

Meta.test("Typename in random runtime", async (t) => {
  const e = await t.engine("typename/typename.py", { secrets });

  await t.should("allow querying typename in an object", async () => {
    await gql`
      query {
        randomUser {
          __typename
        }
      }
    `
      .expectData({
        randomUser: {
          __typename: "user",
        },
      })
      .on(e);
  });
});

Meta.test("Typename in prisma runtime", async (t) => {
  dropSchema("typename");
  const e = await t.engine("typename/typename.py", { secrets });

  await t.should("allow querying typename in an object", async () => {
    await gql`
      mutation {
        createUser(data: { id: 1 }) {
          __typename
          id
        }
      }
    `
      .expectData({
        createUser: {
          __typename: "userprisma_output",
          id: 1,
        },
      })
      .on(e);
  });
});

Meta.test("Typename on union", async (t) => {
  const e = await t.engine("typename/typename.py", { secrets });

  await t.should("get variant type name", async () => {
    await gql`
      query {
        getRgbColor {
          color {
            ... on RgbColor {
              r
              g
              b
              __typename
            }
          }
        }
      }
    `
      .expectData({
        getRgbColor: {
          color: { r: 255, g: 0, b: 0, __typename: "RgbColor" },
        },
      })
      .on(e);
  });
});
