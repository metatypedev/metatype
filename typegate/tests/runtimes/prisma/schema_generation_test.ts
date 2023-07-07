// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { parseTypegraph } from "../../../src/typegraph/parser.ts";
import { serialize, test } from "../../utils.ts";
import { generateDatamodel } from "../../../src/runtimes/prisma/hooks/generate_schema.ts";
import * as PrismaRT from "../../../src/runtimes/prisma/types.ts";
import { assertEquals } from "std/testing/asserts.ts";

async function assertGeneratedSchema(tgName: string) {
  const tg = await parseTypegraph(
    await serialize("runtimes/prisma/schema_generation.py", {
      unique: true,
      typegraph: tgName,
    }),
  );

  const runtime = tg.runtimes.filter((rt) =>
    rt.name === "prisma"
  )[0] as PrismaRT.DS<PrismaRT.DataRaw>;

  assertEquals(
    runtime.data.datamodel,
    generateDatamodel(tg, runtime.data),
  );
}

test("schema generation", async (t) => {
  await t.should("simple model", async () => {
    await assertGeneratedSchema("test-simple-model");
  });

  await t.should("one to many relationship", async () => {
    await assertGeneratedSchema("test-one-to-many");
  });
});
