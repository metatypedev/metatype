// Copyright Metatype under the Elastic License 2.0.

import tg from "./typegraphs/typecheck.json" assert { type: "json" };
import { assertThrows } from "std/testing/asserts.ts";
import { TypeCheck, ValidationSchemaBuilder } from "../src/typecheck.ts";

Deno.test("test typecheck", () => {
  const b = new ValidationSchemaBuilder(tg.schema);
  const typecheck = new TypeCheck(b.build());
  const post1 = {
    id: crypto.randomUUID(),
    title: "Hello",
    content: "Hello, World!",
  };

  assertThrows(
    () => typecheck.validate({ posts: [post1] }),
    Error,
    "/posts/0/author",
  );

  const user = {
    id: crypto.randomUUID(),
    name: "John",
    email: "john@example.com",
    // website: "https://john.example.com",
  };

  const post2 = {
    ...post1,
    author: user,
  };

  assertThrows(
    () => typecheck.validate({ posts: [post2] }),
    Error,
    "/posts/0/published",
  );

  const post3 = { ...post2, published: false };
  typecheck.validate({ posts: [post3] });

  delete (user as any).website;
  typecheck.validate({ posts: [post3] });

  delete (user as any).email;
  console.log({ post3 });
  typecheck.validate(post3);
  assertThrows(
    () => typecheck.validate({ posts: [post3] }),
    Error,
    "/posts/0/author/email",
  );
});
