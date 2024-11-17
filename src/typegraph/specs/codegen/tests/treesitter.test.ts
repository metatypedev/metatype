// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "jsr:@std/assert";
import { getTypeDefs, parseTypeScript } from "../src/lib/treesitter.ts";

Deno.test("Treesitter typedef query", () => {
  const source = `
    type Foo = "bar";

    type MyRecord = {
      foo: "bar";
    };

    type MyUnion = "foo" | "bar";
  `;

  const tree = parseTypeScript(source);
  const typeDefs = getTypeDefs(tree.rootNode);

  assertEquals(typeDefs.length, 3);

  const [first, second, third] = typeDefs.map(({ ident }) => ident.text);

  assertEquals(first, "Foo");
  assertEquals(second, "MyRecord");
  assertEquals(third, "MyUnion");
});
