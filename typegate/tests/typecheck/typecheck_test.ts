// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { test } from "../utils.ts";
import { assert, assertThrows } from "std/testing/asserts.ts";
import { TypeCheck, ValidationSchemaBuilder } from "../../src/typecheck.ts";
import { findOperation } from "../../src/graphql.ts";
import { parse } from "graphql";
import { None } from "monads";

test("typecheck", async (t) => {
  const e = await t.pythonFile("typecheck/typecheck.py");
  const { tg } = e;

  // for syntax highlighting
  const graphql = String.raw;

  const typecheck = (query: string) => {
    const [operation, fragments] = findOperation(parse(query), None);
    if (operation.isNone()) {
      throw new Error("No operation found in the query");
    }
    const validationSchema = new ValidationSchemaBuilder(
      tg.tg.types,
      operation.unwrap(),
      fragments,
    ).build();

    return new TypeCheck(validationSchema);
  };

  await t.should("invalid queries", () => {
    assertThrows(
      () =>
        typecheck(graphql`
          query Q {
            postis {
              id
            }
          }
        `),
      Error,
      "Q.postis is undefined",
    );

    assertThrows(
      () =>
        typecheck(graphql`
          query Q {
            posts {
              id
              title
              text
            }
          }
        `),
      Error,
      "Q.posts.text is undefined",
    );
  });

  let query1: TypeCheck;

  await t.should("valid query", () => {
    query1 = typecheck(graphql`
      query GetPosts {
        posts {
          id
          title
          author {
            id
            username
          }
        }
      }
    `);

    assert(query1 instanceof TypeCheck);
  });

  const post1 = {
    id: crypto.randomUUID(),
    title: "Hello World of Metatype",
    content: "Hello, World!",
  };

  const user1 = { id: crypto.randomUUID() };
  const user2 = { ...user1, username: "john" };

  const post2 = { ...post1, author: user1 };
  const post3 = { ...post1, author: user2 };

  await t.should("data type validation", () => {
    assertThrows(
      () => query1.validate({ posts: [post1] }),
      Error,
      "must have required property 'author' at /posts/0",
    );

    assertThrows(
      () => query1.validate({ posts: [post2] }),
      Error,
      "must have required property 'username' at /posts/0/author",
    );

    query1.validate({ posts: [post3] });

    assertThrows(
      () => query1.validate({ posts: [post3, post2] }),
      Error,
      "must have required property 'username' at /posts/1/author",
    );

    const query2 = typecheck(graphql`
      query GetPosts {
        posts {
          id
          title
          author {
            id
            username
            email
            website
          }
        }
      }
    `);

    const user = {
      id: "user-id",
      username: "john",
      email: "my email",
    };

    assertThrows(
      () =>
        query2.validate({
          posts: [
            {
              ...post1,
              author: user,
            },
          ],
        }),
      Error,
      'must match format "uuid" at /posts/0/author/id',
    );

    assertThrows(
      () =>
        query2.validate({
          posts: [{
            ...post1,
            author: { ...user, id: crypto.randomUUID() },
          }],
        }),
      Error,
      'must match format "email" at /posts/0/author/email',
    );

    assertThrows(
      () =>
        query2.validate({
          posts: [{
            ...post1,
            author: {
              id: crypto.randomUUID(),
              username: "john",
              email: "user@example.com",
              website: "example.com",
            },
          }],
        }),
      Error,
      'must match format "uri" at /posts/0/author/website',
    );

    query2.validate({
      posts: [{
        ...post1,
        author: {
          id: crypto.randomUUID(),
          username: "john",
          email: "user@example.com",
        },
      }],
    });

    query2.validate({
      posts: [{
        ...post1,
        author: {
          id: crypto.randomUUID(),
          username: "john",
          email: "user@example.com",
          website: "https://example.com",
        },
      }],
    });
  });
});
