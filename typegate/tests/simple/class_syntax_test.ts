// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Class Syntax", async (t) => {
  const e = await t.pythonFile("simple/class_syntax.py");
  await t.should("work using the class syntax", async () => {
    await gql`
      query {
        identity(
          id: "1",
          title: "Post Title",
          content: "Post Content",
          likes: 13,
          comments: [
            { title: "c1", content: "comment 1" },
            { title: "c1", content: "comment 2" },
          ]
        ) {
          id
          content
          likes
          comments {
            content
          }
        }
      }
    `
      .expectData({
        identity: {
          content: "Post Content",
          id: "1",
          likes: 13,
          comments: [
            { content: "comment 1" },
            { content: "comment 2" },
          ],
        },
      })
      .on(e);
  });
});
