// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Type } from "../../src/type_node.ts";
import { InputValidationCompiler } from "../../src/typecheck/input.ts";
import { nativeResult } from "../../src/utils.ts";
import { gql, test } from "../utils.ts";
import * as native from "native";
import { assert, assertEquals } from "std/testing/asserts.ts";

test("input validator compiler", async (t) => {
  const e = await t.pythonFile("typecheck/typecheck.py");
  const { tg } = e;

  const root = tg.type(0, Type.OBJECT);

  await t.should("generate valid code", () => {
    const mutations = tg.type(root.properties["mutation"], Type.OBJECT);
    const createPost = tg.type(
      mutations.properties["createPost"],
      Type.FUNCTION,
    );

    const generatedCode = new InputValidationCompiler(tg).generate(
      createPost.input,
    );
    const code = nativeResult(native.typescript_format_code({
      source: generatedCode,
    })).formatted_code;

    t.assertSnapshot(code);
  });

  await t.should("fail for invalid inputs", async () => {
    await gql`
      mutation CreatePost($title: String!, $content: String!, $authorId: String!, $tags: [String]) {
        createPost(title: $title, content: $content, authorId: $authorId, tags: $tags) {
          id
        }
      }
    `
      .withVars({
        title: "Hello!",
        content: "Good morning!",
        authorId: "12",
        tags: ["tech", "web", "programming"],
      })
      .expectBody((body) => {
        assertEquals(body.errors.length, 1);
        t.assertSnapshot(body.errors[0].message);
      })
      .on(e);

    await gql`
      mutation CreateUser($id: String!, $username: String!, $email: String!, $website: String!) {
        createUser(id: $id, username: $username, email: $email, website: $website) {
          id
        }
      }
    `
      .withVars({
        id: crypto.randomUUID(),
        username: "John",
        email: "user email",
        website: "userwebsite",
      })
      .matchErrorSnapshot(t)
      .on(e);
  });

  await t.should("generate valid code with enums", () => {
    const queries = tg.type(root.properties["query"], Type.OBJECT);
    const enums = tg.type(
      queries.properties["enums"],
      Type.FUNCTION,
    );

    const generatedCode = new InputValidationCompiler(tg).generate(enums.input);
    const code = nativeResult(native.typescript_format_code({
      source: generatedCode,
    })).formatted_code;

    t.assertSnapshot(code);
  });

  await t.should("fail for invalid inputs: enums", async () => {
    await gql`
      query Enums($role: String!, $items: [AvailableItem]!) {
        enums(userRole: $role, availableItems: $items) {
          userRole
          availableItems { name unitPrice }
        }
      }
    `
      .withVars({
        role: "model",
        items: [{ name: "banana", unitPrice: 200 }],
      })
      .matchErrorSnapshot(t)
      .on(e);

    await gql`
      query Enums($role: String!, $items: [AvailableItem]!) {
        enums(userRole: $role, availableItems: $items) {
          userRole
          availableItems { name unitPrice }
        }
      }
    `
      .withVars({
        role: "moderator",
        items: [
          { name: "apple", unitPrice: 200 },
          { name: "banana", unitPrice: 200 },
          { name: "orange", unitPrice: 200 },
        ],
      })
      .matchErrorSnapshot(t)
      .on(e);
  });

  await t.should("generate valid code with union and either types", () => {
    const queries = tg.type(root.properties["query"], Type.OBJECT);
    const posts = tg.type(
      queries.properties["posts"],
      Type.FUNCTION,
    );

    const generatedCode = new InputValidationCompiler(tg).generate(posts.input);
    const code = nativeResult(native.typescript_format_code({
      source: generatedCode,
    })).formatted_code;

    t.assertSnapshot(code);
  });

  await t.should("fail for invalid inputs: union", async () => {
    await gql`
      query FindPosts {
        posts(tag: "tech", authorId: "hello") {
          id
        }
      }
    `
      .matchErrorSnapshot(t)
      .on(e);

    await gql`
      query FindPosts {
        posts(tag: ["tech", "programming", "deno"], authorId: "36b8f84d-df4e-4d49-b662-bcde71a8764f") {
          id
        }
      }
    `
      .matchErrorSnapshot(t)
      .on(e);

    await gql`
      query FindPosts {
        posts(tag: ["tech", "deno"], authorId: "36b8f84d-df4e-4d49-b662-bcde71a8764f") {
          id
        }
      }
    `
      .expectBody((body) => {
        assert(body.errors == null);
      })
      .on(e);
  });

  await t.should("fail for invalid inputs: either", async () => {
    await gql`
      query FindPosts {
        posts(search: { title: "Hello" }) {
          id
        }
      }
    `
      .expectBody((body) => {
        assertEquals(body.errors.length, 1);
        t.assertSnapshot(body.errors[0].message);
      })
      .on(e);

    await gql`
      query FindPosts {
        posts(search: { content: ["tech", "programming", "web", "softwares"] }) {
          id
        }
      }
    `
      .expectBody((body) => {
        assertEquals(body.errors.length, 1);
        t.assertSnapshot(body.errors[0].message);
      })
      .on(e);

    await gql`
      query FindPosts {
        posts(search: { title: "Hi" }) {
          id
        }
      }
    `
      .expectBody((body) => {
        assert(body.errors == null);
      })
      .on(e);
  });
});
