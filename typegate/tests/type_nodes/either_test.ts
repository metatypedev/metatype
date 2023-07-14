// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test(
  "Either type",
  async (t) => {
    const e = await t.engine("type_nodes/either_node.py");

    await t.should("allow query with kid variant", async () => {
      await gql`
        query {
          regist_user(user: { age: 11, name: "Bob", school: "The school" }) {
            ... on SuccessTransaction {
              user_id
              date
            }
            ... on FailedTransaction {
              reason
            }
          }
        }
      `
        .expectData({
          regist_user: {
            user_id: "Bob",
            date: "2023-01-01",
          },
        })
        .on(e);
    });

    await t.should("allow query with teen variant", async () => {
      await gql`
        query {
          regist_user(user: { age: 20, name: "Dave", college: "The college" }) {
            ... on SuccessTransaction {
              user_id
              date
            }
            ... on FailedTransaction {
              reason
            }
          }
        }
      `
        .expectData({
          regist_user: {
            user_id: "Dave",
            date: "2023-01-01",
          },
        })
        .on(e);
    });

    await t.should("allow query with adult variant", async () => {
      await gql`
        query {
          regist_user(user: { age: 32, name: "John", company: "The company" }) {
            ... on SuccessTransaction {
              user_id
              date
            }
            ... on FailedTransaction {
              reason
            }
          }
        }
      `
        .expectData({
          regist_user: {
            user_id: "John",
            date: "2023-01-01",
          },
        })
        .on(e);
    });

    await t.should(
      "return only the selected fields when the returned value is an object",
      async () => {
        await gql`
          query {
            regist_user(
              user: { age: 32, name: "John", company: "The company" }
            ) {
              ... on SuccessTransaction {
                date
              }
              ... on FailedTransaction {
                reason
              }
            }
          }
        `
          .expectData({
            regist_user: {
              date: "2023-01-01",
            },
          })
          .on(e);
      },
    );

    await t.should(
      "fail to query if the value does not match a variant type",
      async () => {
        await gql`
          query {
            regist_user(
              user: {
                age: 5
                name: "John"
                # a kid of 5 years should not have company field as it is
                # reserved for adult variant type
                company: "The company"
              }
            ) {
              ... on SuccessTransaction {
                user_id
                date
              }
              ... on FailedTransaction {
                reason
              }
            }
          }
        `
          .matchErrorSnapshot(t)
          .on(e);
      },
    );

    await t.should(
      "fail to query if a value is missing for the variant type it matches",
      async () => {
        await gql`
          query {
            regist_user(
              user: {
                # missing 'name' field
                age: 5
                school: "The school"
              }
            ) {
              ... on SuccessTransaction {
                user_id
                date
              }
              ... on FailedTransaction {
                reason
              }
            }
          }
        `
          .expectErrorContains("Type mismatch: got 'ObjectValue'")
          .on(e);
      },
    );

    await t.should("allow to introspect the either type", async () => {
      await gql`
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
              possibleTypes {
                name
                kind
              }
            }
          }
        }
      `
        .matchOkSnapshot(t)
        .on(e);
    });
  },
  { introspection: true },
);
