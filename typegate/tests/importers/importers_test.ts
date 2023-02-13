// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { assertRejects } from "std/testing/asserts.ts";
import { copyFile, gql, MetaTest, Q, test } from "../utils.ts";

async function testImporter(t: MetaTest, name: string, testQuery?: Q) {
  const file = `importers/copy/${name}.py`;

  await t.should("copy source typegraph definition", async () => {
    await copyFile(`importers/${name}.py`, file);
  });

  await t.should("run the importer", async () => {
    await assertRejects(() => t.pythonFile(file), "No typegraph");
  });

  await t.should("load typegraph and execute query", async () => {
    const e = await t.pythonFile(file);
    if (testQuery != null) {
      await testQuery
        .expectStatus(200)
        .on(e);
    }
    await t.unregister(e);
  });
}

test("GraphQL importer", async (t) => {
  await testImporter(
    t,
    "graphql",
    gql`
      query {
        mutationPrevalenceSubtypes {
          name
        }
      }
    `,
  );
});

test("OpenAPI importer", async (t) => {
  await testImporter(
    t,
    "openapi",
    gql`
    query {
      getPetById(petId: 1) {
        id
        name
        tags {
          id
          name
        }
      }
    }
  `,
  );
});
