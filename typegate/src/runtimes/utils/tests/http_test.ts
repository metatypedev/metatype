import { assertEquals } from "std/testing/asserts.ts";
import { getFieldLists, replaceDynamicPathParams } from "../http.ts";

Deno.test("dynamic path params: {param} syntax", () => {
  assertEquals(
    replaceDynamicPathParams("/posts/{postId}", { postId: 12, text: "Haha" }),
    { pathname: "/posts/12", restArgs: { text: "Haha" } },
  );

  assertEquals(
    replaceDynamicPathParams("/posts/{postId}/comments/{commentNo}", {
      postId: 12,
      commentNo: 3,
    }),
    { pathname: "/posts/12/comments/3", restArgs: {} },
  );
});

Deno.test("dynamic path params: :param syntax", () => {
  assertEquals(
    replaceDynamicPathParams("/posts/:postId", { postId: 12, text: "Haha" }),
    { pathname: "/posts/12", restArgs: { text: "Haha" } },
  );

  assertEquals(
    replaceDynamicPathParams("/posts/:postId/comments/:commentNo", {
      postId: 12,
      commentNo: 3,
    }),
    { pathname: "/posts/12/comments/3", restArgs: {} },
  );
});

Deno.test("dynamic path params: params without values are not replaced", () => {
  assertEquals(
    replaceDynamicPathParams("/posts/{postId}/comments/{commentNo}", {
      postId: 12,
    }),
    { pathname: "/posts/12/comments/{commentNo}", restArgs: {} },
  );
  assertEquals(
    replaceDynamicPathParams("/posts/:postId/comments/:commentNo", {
      postId: 12,
    }),
    { pathname: "/posts/12/comments/:commentNo", restArgs: {} },
  );
});

const args = { a: "a", b: "b", c: "c", d: "d" };

Deno.test("field list: GET", () => {
  assertEquals(
    getFieldLists("GET", args, {
      content_type: "application/json",
      query_fields: null,
      body_fields: null,
    }),
    { query: ["a", "b", "c", "d"], body: [] },
  );

  assertEquals(
    getFieldLists(
      "GET",
      args,
      {
        content_type: "application/json",
        query_fields: null,
        body_fields: ["c", "d"],
      },
    ),
    { query: ["a", "b"], body: ["c", "d"] },
  );

  assertEquals(
    getFieldLists(
      "GET",
      args,
      {
        content_type: "application/json",
        query_fields: ["a", "b"],
        body_fields: null,
      },
    ),
    { query: ["a", "b"], body: [] },
  );

  assertEquals(
    getFieldLists(
      "GET",
      args,
      {
        content_type: "application/json",
        query_fields: ["a", "b", "e"],
        body_fields: ["c", "f"],
      },
    ),
    { query: ["a", "b"], body: ["c"] },
  );

  // TODO: name clash case
});

Deno.test("field list: POST", () => {
  assertEquals(
    getFieldLists("POST", args, {
      content_type: "application/json",
      query_fields: null,
      body_fields: null,
    }),
    { query: [], body: ["a", "b", "c", "d"] },
  );

  assertEquals(
    getFieldLists(
      "POST",
      args,
      {
        content_type: "application/json",
        query_fields: null,
        body_fields: ["c", "d"],
      },
    ),
    { query: ["a", "b"], body: ["c", "d"] },
  );

  assertEquals(
    getFieldLists(
      "POST",
      args,
      {
        content_type: "application/json",
        query_fields: ["a", "b"],
        body_fields: null,
      },
    ),
    { query: ["a", "b"], body: ["c", "d"] },
  );

  assertEquals(
    getFieldLists(
      "POST",
      args,
      {
        content_type: "application/json",
        query_fields: ["a", "b", "e"],
        body_fields: ["c", "f"],
      },
    ),
    { query: ["a", "b"], body: ["c"] },
  );

  // TODO: name clash case
});
