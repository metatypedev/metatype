// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Class Syntax", async (t) => {
  const e = await t.pythonFile("simple/class_syntax.py");
  await t.should("work using the class syntax", async () => {
    await gql`
      query {
        identity(
          id: "1",
          title: "Post Title",
          content: "Post Content",
          likes: 13,
          comments: [
            { title: "c1", content: "comment 1" },
            { title: "c1", content: "comment 2" }
          ],
          metadatas: [
            { name: "tag name" },
            { title: "info", content: "content" }
          ],
        ) {
          id
          content
          likes
          comments {
            content
          }
          metadatas {
            ... on Tag {
              name
            }
            ... on Info {
              title
              content
            }
          }
        }
      }
    `
      .expectData({
        identity: {
          content: "Post Content",
          id: "1",
          likes: 13,
          comments: [
            { content: "comment 1" },
            { content: "comment 2" },
          ],
          metadatas: [
            { name: "tag name" },
            { title: "info", content: "content" },
          ],
        },
      })
      .on(e);
  });

  await t.should("work with basic constraints", async () => {
    await gql`
      query {
        identity(
          id: "1",
          content: "Post Content",
          comments: [ { title: "", content: "" } ]
        ) {
          comments {
            content
          }
        }
      }
    `
      .expectErrorContains(
        "<value>.comments[0].title: expected minimum length: 2",
      )
      .on(e);
  });

  await t.should("work with struct > class", async () => {
    await gql`
      query {
        id_struct_class(
          b: "B!",
          class: { a: "A!" }
        ) {
          b
          class { a }
        }
      }
    `.expectData({
      id_struct_class: {
        b: "B!",
        class: { a: "A!" },
      },
    })
      .on(e);
  });

  await t.should("work with class > struct > class", async () => {
    await gql`
      query {
        id_class_struct(
          c: "C!",
          struct: {
            b: "B!",
            class: { a: "A!" },
          },
        ) {
          c
          struct {
            b
            class { a }
          }
        }
      }
    `.expectData({
      id_class_struct: {
        c: "C!",
        struct: {
          b: "B!",
          class: { a: "A!" },
        },
      },
    })
      .on(e);
  });

  await t.should("be valid", async () => {
    await gql`
      query IntrospectionQuery {
        __schema {
          queryType { 
            name 
            kind 
          }
          types {
            name
            kind
            fields { 
              name 
            }
          }
        }
      }
    `
      .matchSnapshot(t)
      .on(e);
  });
}, { introspection: true });
