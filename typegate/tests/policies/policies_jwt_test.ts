// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";
import * as jwt from "jwt";

Meta.test("JWT with various formats", async (t) => {
  const secret = "mysupersecretkey";
  const e = await t.engine("policies/policies_jwt_format.py", {
    secrets: {
      NATIVE_JWT: secret,
    },
  });

  const contextEncoder = async (context: Record<string, unknown>) => {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: { name: "SHA-256" } },
      true,
      ["sign"],
    );

    const token = await jwt.create(
      { alg: "HS256", typ: "JWT" },
      context,
      key,
    );

    return `Bearer ${token}`;
  };

  await t.should("support raw hmac-256", async () => {
    await gql`
      query {
        sayHelloWorld
      }
    `
      .withContext({
        "role": "myrole",
      }, contextEncoder)
      .expectData({
        sayHelloWorld: "Hello World!",
      })
      .on(e);
  });
});
