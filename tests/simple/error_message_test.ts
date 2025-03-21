// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("Proposition on error thrown", async (t) => {
  const e = await t.engine("simple/error_message.py");

  await t.should("propose closest name ", async () => {
    await gql`
      query {
        returnSelfQuery(id: 1, name: "") {
          id
          naem # typo
        }
      }
    `
      .expectErrorContains("did you mean 'name'")
      .on(e);
  });

  await t.should("propose Mutation", async () => {
    await gql`
      query {
        returnSelfMutation(id: 1, name: "") {
          id
          name
        }
      }
    `
      .expectErrorContains(
        "did you mean using 'returnSelfMutation' from 'Mutation'",
      )
      .on(e);
  });

  await t.should("propose Query", async () => {
    await gql`
      mutation {
        returnSelfQuery(id: 1, name: "") {
          id
          name
        }
      }
    `
      .expectErrorContains(
        "did you mean using 'returnSelfQuery' from 'Query'",
      )
      .on(e);
  });

  await t.should("propose all available names", async () => {
    await gql`
      query {
        thisFuncDoesNotExist {
          some_field
        }
      }
    `
      .expectErrorContains("available names are: returnSelf, returnSelfQuery")
      .on(e);
  });
});
