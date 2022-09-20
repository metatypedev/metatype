// Copyright Metatype under the Elastic License 2.0.

import { gql, test } from "./utils.ts";
import * as mf from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";

mf.install();

function generateUser(id: number) {
  return {
    id,
    email: `user.${id}@example.com`,
    name: `User ${id}`,
  };
}

function generatePost(id: number) {
  return {
    id,
    title: "My first post",
    summary: "This is my first post",
    content: "Lorem ipsum dolor sit amet, in sit docendi constituto.",
    authorId: id + 10,
  };
}

test("Rest queries", async (t) => {
  const e = await t.pythonFile("typegraphs/nesting.py");

  mf.mock("GET@/api/users/:id", (req, params) => {
    const userId = Number(params.id);
    if (userId > 1000) {
      return new Response(null, {
        status: 404,
      });
    }
    return new Response(JSON.stringify(generateUser(userId)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  mf.mock("GET@/api/posts/:id", (_req, params) => {
    const postId = Number(params.id);
    if (postId > 1000) {
      return new Response(null, {
        status: 404,
      });
    }
    return new Response(JSON.stringify(generatePost(postId)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  await t.should("work with dynamic path params", async () => {
    await gql`
      query {
        post(id: 12) {
          id
          title
          summary
          content
          authorId
          author {
            id
            name
            email
          }
        }
      }
    `
      .expectData({
        post: {
          ...generatePost(12),
          author: generateUser(12 + 10),
        },
      })
      .on(e);
  });
});
