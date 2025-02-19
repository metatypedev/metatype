// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { Typegraph } from "@metatype/typegate/typegraph/types.ts";
import { assert, assertEquals } from "@std/assert";
import { FunctionNode } from "@metatype/typegate/typegraph/type_node.ts";

Meta.test("dedup test", async ({ t }) => {
  const { stdout } = await Meta.cli(
    "serialize",
    "--pretty",
    "-f",
    "dedup/tg.ts",
  );
  const tg: Typegraph[] = JSON.parse(stdout);

  console.log(tg);

  const [objTg, matTg] = tg;

  await t.step("object dedup", () => {
    const ints = [];
    const strs = [];
    for (const ty of objTg.types) {
      if (ty.type == "integer") {
        ints.push(ty);
      }
      if (ty.type == "string") {
        strs.push(ty);
      }
    }
    assertEquals(ints.length, 2);
    assert(ints.some((ty) => ty.title == "namedInt"));
    assertEquals(strs.length, 3);
    assert(strs.some((ty) => ty.format == "uuid"));
    assertEquals(strs.filter((ty) => ty.format == "date-time").length, 1);
  });

  await t.step("materializer dedup", () => {
    const fnInput = matTg.types.findIndex(
      ({ title }) => title === "root_f1_fn_input",
    );
    const fnOutput = matTg.types.findIndex(
      ({ title }) => title === "root_f1_fn_output",
    );

    const f1 = matTg.types.find(
      ({ title }) => title === "root_f1_fn",
    ) as FunctionNode;
    const f2 = matTg.types.find(
      ({ title }) => title === "root_f2_fn",
    ) as FunctionNode;

    assertEquals(f1.input, fnInput);
    assertEquals(f2.input, fnInput);
    assertEquals(f1.output, fnOutput);
    assertEquals(f2.output, fnOutput);
  });

  await t.step("unique type names", () => {
    const typeNames = objTg.types.concat(matTg.types).map(({ title }) => title);
    const nameSet = new Set(typeNames);

    assertEquals(typeNames.length, nameSet.size);
  });
});
