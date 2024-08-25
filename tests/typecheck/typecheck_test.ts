// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";
import { assertThrows } from "@std/assert";
import { findOperation } from "@metatype/typegate/transports/graphql/graphql.ts";
import { parse } from "graphql";
import { None } from "monads";
import {
  generateValidator,
  ResultValidationCompiler,
} from "@metatype/typegate/engine/typecheck/result.ts";

Meta.test("typecheck", async (t) => {
  const e = await t.engine("typecheck/typecheck.py");
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

  await t.should("generate validation code for valid queries", async () => {
    const code = getValidationCode(queryGetPosts);

    await t.assertSnapshot(code);
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

    t.assertThrowsSnapshot(() => validate({ posts: [post2] }));

    validate({ posts: [post3] });

    t.assertThrowsSnapshot(() => validate({ posts: [post3, post2] }));

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

    t.assertThrowsSnapshot(() =>
      validate2({
        posts: [
          {
            ...post1,
            author: user,
          },
        ],
      })
    );

    t.assertThrowsSnapshot(() =>
      validate2({
        posts: [
          {
            ...post1,
            author: { ...user, id: crypto.randomUUID() },
          },
        ],
      })
    );

    t.assertThrowsSnapshot(() =>
      validate2({
        posts: [
          {
            ...post1,
            author: {
              id: crypto.randomUUID(),
              username: "john",
              email: "user@example.com",
              website: "example.com",
            },
          },
        ],
      })
    );

    validate2({
      posts: [
        {
          ...post1,
          author: {
            id: crypto.randomUUID(),
            username: "john",
            email: "user@example.com",
          },
        },
      ],
    });

    validate2({
      posts: [
        {
          ...post1,
          author: {
            id: crypto.randomUUID(),
            username: "john",
            email: "user@example.com",
            website: "https://example.com",
          },
        },
      ],
    });
  });

  await t.should("accept explicit null value", async () => {
    await gql`
      query {
        findProduct(
          name: "A"
          equivalent: [
            { name: "B", equivalent: null }
            { name: "C", score: null }
            { name: "D", score: 10 }
          ]
          score: null
        ) {
          name
          equivalent {
            name
            equivalent {
              name
            }
            score
          }
          score
        }
      }
    `
      .expectData({
        findProduct: {
          name: "A",
          equivalent: [{ name: "B" }, { name: "C" }, { name: "D", score: 10 }],
          score: null,
        },
      })
      .on(e);
  });
});
