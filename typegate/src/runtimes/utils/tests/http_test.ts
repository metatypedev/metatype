import { assertEquals } from "std/testing/asserts.ts";
import { replaceDynamicPathParams } from "../http.ts";

Deno.test("dynamic path params with {param} syntax", () => {
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

Deno.test("dynamic path params with :param syntax", () => {
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

Deno.test("params without values are not replaced", () => {
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
