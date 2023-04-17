// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test(
  "Either type",
  async (t) => {
    const e = await t.pythonFile("type_nodes/either_node.py");

    await t.should("allow query with kid variant", async () => {
      await gql`
        query {
          regist_user(user: { age: 11, name: "Bob", school: "The school" }) {
            user_id
            date
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
            user_id
            date
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
            user_id
            date
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
              date
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
              user_id
              date
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
              user_id
              date
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
        .matchSnapshot(t)
        .on(e);
    });
  },
  { introspection: true },
);
