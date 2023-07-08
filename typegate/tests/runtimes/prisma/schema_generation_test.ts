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
  await t.should("generate datamodel for simple model", async () => {
    await assertGeneratedSchema("simple-model");
  });

  await t.should(
    "generate datamodel with one to many relationship",
    async () => {
      await assertGeneratedSchema("one-to-many");
      await assertGeneratedSchema("implicit-one-to-many");
      // TODO also reversed order version
    },
  );

  await t.should(
    "generate datamodel with optional one to many relationship",
    async () => {
      await assertGeneratedSchema("optional-one-to-many");
      // TODO revered order
    },
  );

  await t.should(
    "generate datamodel with one to one relationship",
    async () => {
      await assertGeneratedSchema("one-to-one");
      await assertGeneratedSchema("implicit-one-to-one");
      // TODO also reversed order version
    },
  );

  await t.should(
    "generate datamodel with optional one to one relationship",
    async () => {
      await assertGeneratedSchema("optional-one-to-one");
      // TODO revered order
    },
  );

  // TODO fails optional one-to-one with ambiguous direction
  //

  await t.should(
    "generate datamodel with semi-implicit one to one relationship",
    async () => {
      await assertGeneratedSchema("semi-implicit-one-to-one");
      await assertGeneratedSchema("semi-implicit-one-to-one-2");
      // TODO revered order
    },
  );

  await t.should(
    "generate datamodel with one to many self",
    async () => {
      await assertGeneratedSchema("one-to-many-self");
      await assertGeneratedSchema("explicit-one-to-many-self");
      await assertGeneratedSchema("one-to-many-self-2");
      await assertGeneratedSchema("explicit-one-to-many-self-2");
    },
  );

  await t.should("generate datamodel with one to one self", async () => {
    await assertGeneratedSchema("one-to-one-self");
    await assertGeneratedSchema("one-to-one-self-2");
  });

  await t.should(
    "generate typegraph with multiple relationships",
    async () => {
      await assertGeneratedSchema("multiple-relationships");
      await assertGeneratedSchema("multiple-relationships-2");
      await assertGeneratedSchema("multiple-self-relationships");
    },
  );

  // TODO test missing target
});
