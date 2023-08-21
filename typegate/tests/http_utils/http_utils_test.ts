// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals } from "std/assert/mod.ts";
import { replaceDynamicPathParams } from "../../src/runtimes/utils/http.ts";

Deno.test("dynamic path params", async (t) => {
  await t.step("{param} syntax", () => {
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

  await t.step(":param syntax", () => {
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

  await t.step("params without values are not replaced", () => {
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
});
