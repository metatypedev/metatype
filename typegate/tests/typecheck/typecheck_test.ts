// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { test } from "../utils.ts";
import { assertThrows } from "std/testing/asserts.ts";
import { findOperation } from "../../src/graphql.ts";
import { parse } from "graphql";
import { None } from "monads";
import {
  generateValidator,
  ResultValidationCompiler,
} from "../../src/typecheck/result.ts";
import * as native from "native";
import { nativeResult } from "../../src/utils.ts";

test("typecheck", async (t) => {
  const e = await t.pythonFile("typecheck/typecheck.py");
  const { tg } = e;

  // for syntax highlighting
  const graphql = String.raw;

  const getValidationCode = (query: string) => {
    const [operation, fragments] = findOperation(parse(query), None);
    if (operation.isNone()) {
      throw new Error("No operation found in the query");
    }

    return new ResultValidationCompiler(tg, fragments).generate(
      operation.unwrap(),
    );
  };

  const getValidator = (query: string) => {
    const [operation, fragments] = findOperation(parse(query), None);
    if (operation.isNone()) {
      throw new Error("No operation found in the query");
    }

    return generateValidator(tg, operation.unwrap(), fragments);
  };

  await t.should("fail for invalid queries", () => {
    assertThrows(
      () =>
        getValidationCode(graphql`
          query Query1 {
            postis {
              id
            }
          }
        `),
      Error,
      "Unexpected property 'postis' at 'Query1'",
    );

    console.log("Q2");

    assertThrows(
      () =>
        getValidationCode(graphql`
          query Query2 {
            posts {
              id
              title
              text
            }
          }
        `),
      Error,
      "Unexpected property 'text' at 'Query2.posts'",
    );
  });

  const queryGetPosts = graphql`
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
  `;

  await t.should("generate validation code for valid queries", () => {
    const code = getValidationCode(queryGetPosts);

    const formattedCode = nativeResult(native.typescript_format_code({
      source: code,
    })).formatted_code;
    console.log("-- START code --");
    console.log(formattedCode);
    console.log("-- END code --");
    t.assertSnapshot(formattedCode);
  });

  const post1 = {
    id: crypto.randomUUID(),
    title: "Hello World of Metatype",
    // content: "Hello, World!",
  };

  const user1 = { id: crypto.randomUUID() };
  const user2 = { ...user1, username: "john" };

  const post2 = { ...post1, author: user1 };
  const post3 = { ...post1, author: user2 };

  await t.should("data type validation", () => {
    const validate = getValidator(queryGetPosts);
    t.assertThrowsSnapshot(() => validate({ posts: [post1] }));

    t.assertThrowsSnapshot(
      () => validate({ posts: [post2] }),
    );

    validate({ posts: [post3] });

    t.assertThrowsSnapshot(
      () => validate({ posts: [post3, post2] }),
    );

    const validate2 = getValidator(graphql`
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

    t.assertThrowsSnapshot(
      () =>
        validate2({
          posts: [
            {
              ...post1,
              author: user,
            },
          ],
        }),
    );

    t.assertThrowsSnapshot(
      () =>
        validate2({
          posts: [{
            ...post1,
            author: { ...user, id: crypto.randomUUID() },
          }],
        }),
    );

    t.assertThrowsSnapshot(
      () =>
        validate2({
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
    );

    validate2({
      posts: [{
        ...post1,
        author: {
          id: crypto.randomUUID(),
          username: "john",
          email: "user@example.com",
        },
      }],
    });

    validate2({
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
