// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, test } from "../../utils.ts";
import * as mf from "test/mock_fetch";

mf.install();

function generatePost(id: number) {
  return {
    id,
    title: "My first post",
    summary: "This is my first post",
    content: "Lorem ipsum dolor sit amet, in sit docendi constituto.",
  };
}

type Post = ReturnType<typeof generatePost>;

function generateComment(id: number, postId: number) {
  return {
    id,
    postId,
    content: "Hahah",
  };
}

const ALL_POSTS = [1, 2, 4, 7, 12, 34, 67].map(generatePost);
const getComments = (postId: number) =>
  [12, 34, 95, 203].map((id) => generateComment(id, postId));
const NEW_COMMENT_ID = 123;

test("Rest queries", async (t) => {
  const e = await t.pythonFile("runtimes/rest/rest.py");

  mf.mock("GET@/api/posts", (req) => {
    const tags = new URL(req.url).searchParams.getAll("tags");
    const posts = tags.reduce((list, tag) => {
      switch (tag) {
        case "even":
          return list.filter((p) => p.id % 2 === 0);
        case "m3":
          return list.filter((p) => p.id % 3 === 0);
        default:
          return list;
      }
    }, ALL_POSTS);
    return new Response(JSON.stringify(posts), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  await t.should("work with simple request", async () => {
    await gql`
      query {
        posts {
          id
          title
          summary
          content
        }
      }
    `
      .expectData({
        posts: ALL_POSTS,
      })
      .on(e);
  });

  await t.should("work with simple request and filtered fields", async () => {
    await gql`
      query {
        posts {
          id
          title
          summary
        }
      }
    `
      .expectData({
        posts: ALL_POSTS.map((post) => {
          const { content: _, ...postWithoutContent } = post;
          return postWithoutContent as Omit<Post, "content">;
          // I don't know why I get a TS error without that cast
        }),
      })
      .on(e);
  });

  await t.should("work with array args", async () => {
    await gql`
      query {
        postsByTags(tags: ["even", "m3"]) {
          id
          title
          summary
          content
        }
      }
    `
      .expectData({
        postsByTags: ALL_POSTS.filter((p) => p.id % 2 === 0).filter(
          (p) => p.id % 3 === 0,
        ),
      })
      .on(e);
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
        }
      }
    `
      .expectData({
        post: generatePost(12),
      })
      .on(e);
  });

  await t.should("return null on 404", async () => {
    await gql`
      query {
        post(id: 1234) {
          id
          title
          summary
          content
        }
      }
    `
      .expectData({
        post: null,
      })
      .on(e);
  });

  const AUTH_TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789";
  mf.mock("PUT@/api/posts/:id/approved", (req, params) => {
    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return new Response(null, { status: 404 });
    }
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${AUTH_TOKEN}`) {
      return new Response(JSON.stringify({ approved: true }), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      return new Response(null, {
        status: 403,
      });
    }
  });

  await t.should("work with bearer auth", async () => {
    await gql`
      mutation {
        approvePost(id: 12, approved: true, authToken: ${AUTH_TOKEN}) {
          approved
        }
      }
    `
      .expectData({
        approvePost: {
          approved: true,
        },
      })
      .on(e);
  });

  mf.mock("PATCH@/api/posts/:id", async (req, params) => {
    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return new Response(null, { status: 404 });
    }
    return new Response(
      JSON.stringify({
        ...generatePost(postId),
        ...(await req.json()),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });

  await t.should("work with PATCH", async () => {
    await gql`
      mutation {
        updatePost(id: 12, content: "New post content") {
          id
          title
          summary
          content
        }
      }
    `
      .expectData({
        updatePost: { ...generatePost(12), content: "New post content" },
      })
      .on(e);
  });

  mf.mock("GET@/api/comments", (req) => {
    const params = new URL(req.url).searchParams;
    const postId = Number(params.get("postId") ?? NaN);
    if (Number.isNaN(postId)) {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify(getComments(postId)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  await t.should("work with query params", async () => {
    await gql`
      query {
        comments(postId: 14) {
          id
          content
          postId
        }
      }
    `
      .expectData({
        comments: getComments(14),
      })
      .on(e);
  });

  mf.mock("POST@/api/comments", async (req) => {
    const params = new URL(req.url).searchParams;
    const postId = Number(params.get("postId") ?? NaN);
    if (Number.isNaN(postId)) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    return new Response(
      JSON.stringify({
        id: NEW_COMMENT_ID,
        postId,
        ...(await req.json()),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });

  await t.should("work with query params and body", async () => {
    await gql`
      mutation {
        postComment(postId: 12, content: "Right!") {
          id
          postId
          content
        }
      }
    `
      .expectData({
        postComment: {
          id: NEW_COMMENT_ID,
          postId: 12,
          content: "Right!",
        },
      })
      .on(e);
  });

  mf.mock("PUT@/api/comments/:id", async (req, params) => {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(
      JSON.stringify({
        id,
        ...(await req.json()),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });

  await t.should("work with PUT", async () => {
    await gql`
      mutation {
        replaceComment(id: 12, postId: 123, content: "Some comment") {
          id
          content
        }
      }
    `
      .expectData({
        replaceComment: {
          id: 12,
          content: "Some comment",
        },
      })
      .on(e);
  });

  mf.mock("DELETE@/api/comments/:id", (_req, params) => {
    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    return new Response(null, {
      status: 204,
    });
  });

  await t.should("work with DELETE method", async () => {
    await gql`
      mutation {
        deleteComment(id: 12)
      }
    `
      .expectData({
        deleteComment: true,
      })
      .on(e);
  });
});
