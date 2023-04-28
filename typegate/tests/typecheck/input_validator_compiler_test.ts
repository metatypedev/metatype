// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Type } from "../../src/type_node.ts";
import { nativeResult } from "../../src/utils.ts";
import { compile } from "../../src/validator/input/compiler.ts";
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

    const generatedCode = compile(tg, createPost.input);
    const code = nativeResult(native.typescript_format_code({
      source: generatedCode,
    })).formatted_code;

    console.log("-- BEGIN code");
    console.log(code);
    console.log("-- END code");
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
  });

  await t.should("generate valid code with union and either types", () => {
    const queries = tg.type(root.properties["query"], Type.OBJECT);
    const posts = tg.type(
      queries.properties["posts"],
      Type.FUNCTION,
    );

    const generatedCode = compile(tg, posts.input);
    const code = nativeResult(native.typescript_format_code({
      source: generatedCode,
    })).formatted_code;

    console.log("-- BEGIN code");
    console.log(code);
    console.log("-- END code");
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
      .expectBody((body) => {
        assertEquals(body.errors.length, 1);
        t.assertSnapshot(body.errors[0].message);
      })
      .on(e);

    await gql`
      query FindPosts {
        posts(tag: ["tech", "programming", "deno"], authorId: "36b8f84d-df4e-4d49-b662-bcde71a8764f") {
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
