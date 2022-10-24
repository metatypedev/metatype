// Copyright Metatype under the Elastic License 2.0.

import tg from "./typegraphs/typecheck.json" assert { type: "json" };
import { assert, assertEquals, assertThrows } from "std/testing/asserts.ts";
import {
  QueryTypeCheck,
  TypeCheck,
  ValidationSchemaBuilder,
} from "../src/typecheck.ts";
import { findOperation } from "../src/graphql.ts";
import { parse } from "graphql";

Deno.test("typecheck", async (t) => {
  const validationSchema = new ValidationSchemaBuilder(tg.types).build();

  const typecheck = new TypeCheck(validationSchema);

  const gql = (strings: readonly string[], ...args: any[]) => {
    const query = strings
      .map((q, i) => `${q}${args[i] ? JSON.stringify(args[i]) : ""}`)
      .join("");
    const [operation, fragments] = findOperation(parse(query), undefined);
    if (operation == null) {
      throw new Error("No operation found in the query");
    }
    return typecheck.validateQuery(operation, fragments);
  };

  await t.step("invalid queries", () => {
    assertThrows(
      () =>
        gql`
        query Q {
          postis {
            id
          }
        }
      `,
      Error,
      "Q.postis is undefined",
    );

    assertThrows(
      () =>
        gql`
        query Q {
          posts {
            id
            title
            text
          }
        }
      `,
      Error,
      "Q.posts.text is undefined",
    );
  });

  let query1: QueryTypeCheck;

  await t.step("valid query", () => {
    query1 = gql`
      query GetPosts {
        posts {
          id
          title
          author {
            id
            name
          }
        }
      }
    `;

    assert(query1 instanceof QueryTypeCheck);
  });

  const post1 = {
    id: crypto.randomUUID(),
    title: "Hello",
    content: "Hello, World!",
  };

  const user1 = { id: crypto.randomUUID() };
  const user2 = { ...user1, name: "John" };

  const post2 = { ...post1, author: user1 };
  const post3 = { ...post1, author: user2 };

  await t.step("data type validation", () => {
    assertThrows(
      () => query1.validate({ posts: [post1] }),
      Error,
      "Expected object at /posts/0/author",
    );

    assertThrows(
      () => query1.validate({ posts: [post2] }),
      Error,
      "Expected string at /posts/0/author/name",
    );

    query1.validate({ posts: [post3] });

    assertThrows(
      () => query1.validate({ posts: [post3, post2] }),
      Error,
      "Expected string at /posts/1/author/name",
    );

    const query2 = gql`
      query GetPosts {
        posts {
          id
          title
          author {
            id
            name
            email
            website
          }
        }
      }
    `;

    assertThrows(
      () =>
        query2.validate({
          posts: [
            {
              ...post1,
              author: {
                id: "user-id",
              },
            },
          ],
        }),
      Error,
      "Expected string to match format 'uuid' at /posts/0/author/id",
    );

    assertThrows(
      () =>
        query2.validate({
          posts: [{
            ...post1,
            author: {
              id: crypto.randomUUID(),
              name: "John",
              email: "my email address",
            },
          }],
        }),
      Error,
      "Expected string to match format 'email' at /posts/0/author/email",
    );

    assertThrows(
      () =>
        query2.validate({
          posts: [{
            ...post1,
            author: {
              id: crypto.randomUUID(),
              name: "John",
              email: "user@example.com",
              website: "example.com",
            },
          }],
        }),
      Error,
      "Expected string to match format 'uri' at /posts/0/author/website",
    );

    query2.validate({
      posts: [{
        ...post1,
        author: {
          id: crypto.randomUUID(),
          name: "John",
          email: "user@example.com",
        },
      }],
    });

    query2.validate({
      posts: [{
        ...post1,
        author: {
          id: crypto.randomUUID(),
          name: "John",
          email: "user@example.com",
          website: "https://example.com",
        },
      }],
    });
  });

  await t.step("remove extra props in objects", () => {
    const postId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const value = query1.validate({
      posts: [{
        id: postId,
        title: "Hello",
        published: false,
        author: {
          id: userId,
          name: "John",
          email: "user@example.com",
        },
      }],
    });

    assertEquals(value, {
      posts: [{
        id: postId,
        title: "Hello",
        author: {
          id: userId,
          name: "John",
        },
      }],
    });
  });
});
