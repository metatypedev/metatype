import { gql, test } from "./utils.ts";
import * as mf from "https://deno.land/x/mock_fetch@0.2.0/mod.ts";

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

mf.mock("GET@/api/posts", (_req, _match) => {
  return new Response(JSON.stringify(ALL_POSTS), {
    status: 200,
  });
});

mf.mock("GET@/api/posts/:id", (_req, match) => {
  return new Response(JSON.stringify(generatePost(Number(match.params.id))), {
    status: 200,
  });
});

mf.mock("GET@/api/comments", (req) => {
  const params = new URL(req.url).searchParams;
  const postId = Number(params.get("postId") ?? NaN);
  if (Number.isNaN(postId)) {
    return new Response("not found", { status: 404 });
  }
  return new Response(JSON.stringify(getComments(postId)), {
    status: 200,
  });
});

// TODO: query params and body
// mf.mock("POST@/api/comments", async (req) => {
//   const params = new URL(req.url).searchParams;
//   const postId = Number(params.get("postId") ?? NaN);
//   if (Number.isNaN(postId)) {
//     return new Response("not found", { status: 404 });
//   }
//   return new Response(JSON.stringify({
//     id: NEW_COMMENT_ID,
//     ...(await req.json())
//   }));
// });

test("Rest queries", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/rest.py");

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
    `.expectData({
      posts: ALL_POSTS,
    }).on(e);
  });

  await t.should("work with simple request (2)", async () => {
    await gql`
      query {
        posts {
          id
          title
          summary
        }
      }
    `.expectData({
      posts: ALL_POSTS.map((post) => {
        const { content, ...postWithoutContent } = post;
        return postWithoutContent as Omit<Post, "content">;
        // I don't know why I get a TS error without that cast
      }),
    }).on(e);
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
    `.expectData({
      post: generatePost(12),
    }).on(e);
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
    `.expectData({
      comments: getComments(14),
    }).on(e);
  });
});
