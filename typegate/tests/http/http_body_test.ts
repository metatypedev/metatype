// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, test } from "../utils.ts";
import { assertEquals } from "std/testing/asserts.ts";

test("post content-length with empty body", async (t) => {
  const e = await t.pythonFile("http/http_body.py");

  await t.should("work", async () => {
    await gql`
      query {
        identity(message: "Hello World") {
          message
        }
      }
    `
      .expectData({
        identity: {
          message: "Hello World",
        },
      })
      .on(e);
  });

  await t.should("throw when Content-Length is 0", async () => {
    await gql`
      query {
        identity(message: "Hello World") {
          message
        }
      }
    `
      .withHeaders({
        "Content-Length": "0",
      })
      .expectBody((body) => {
        assertEquals(body, "empty body was provided");
      })
      .on(e);
  });

  await t.should("throw when Content-Length is undefined", async () => {
    await gql`
      query {
        identity(message: "Hello World") {
          message
        }
      }
    `
      .withoutHeaders(["Content-Length"])
      .expectBody((body) => {
        assertEquals(
          body,
          "POST request must specify 'Content-Length' in the header",
        );
      })
      .on(e);
  });
});
