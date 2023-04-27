// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Type } from "../../src/type_node.ts";
import { nativeResult } from "../../src/utils.ts";
import { compile } from "../../src/validator/input/compiler.ts";
import { gql, test } from "../utils.ts";
import * as native from "native";
import { assertEquals } from "std/testing/asserts.ts";

test("input validator compiler", async (t) => {
  const e = await t.pythonFile("typecheck/typecheck.py");
  const { tg } = e;

  await t.should("generate valid code", () => {
    const root = tg.type(0, Type.OBJECT);
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
      mutation CreatePost {
        createPost(title: "Hello!", content: "Good morning!", authorId: "12") {
          id
        }
      }
    `
      .expectBody((body) => {
        assertEquals(body.errors.length, 1);
        t.assertSnapshot(body.errors[0].message);
      })
      .on(e);
  });
});
