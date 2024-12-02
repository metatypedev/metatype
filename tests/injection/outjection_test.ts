// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "test-utils/mod.ts";
import FakeTimers from "@sinonjs/fake-timers";

Meta.test("outjection", async (t) => {
  const e = await t.engine("injection/outjection.py", {
    secrets: {
      "user_password": "some-unguessable-super-secret",
    },
  });

  await t.should("return context-value", async () => {
    const clock = FakeTimers.install();
    try {
      await gql`
      query {
        randomUser {
          id
          age
          email
          password
          createdAt
          firstPost {
            title
            # publisherEmail
          }
        }
      }
    `
        .withContext({ user_email: "john@doe.com" })
        .expectData({
          randomUser: {
            id: "c268eb36-af9a-59ea-a06c-fe5400289ad3",
            age: 19,
            email: "john@doe.com",
            password: "some-unguessable-super-secret",
            createdAt: new Date().toISOString(),
            firstPost: {
              title: "]1*ajw]krgD",
              // publisherEmail: "john@doe.com",
            },
          },
        })
        .on(e);
    } finally {
      clock.uninstall();
    }
  });
});
