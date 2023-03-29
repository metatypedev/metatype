// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { assertRejects } from "std/testing/asserts.ts";
import { copyFile, gql, test } from "../utils.ts";
import * as mf from "test/mock_fetch";
import { MetaTest } from "../utils/metatest.ts";
import { Q } from "../utils/q.ts";

mf.install();

mf.mock("GET@/api/v3/pet/1", () => {
  return new Response(JSON.stringify({ id: 1, name: "jorge", tags: [] }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

mf.mock("POST@/graphql", () => {
  return new Response(
    JSON.stringify({
      data: { mutationPrevalenceSubtypes: [{ name: "jorge" }] },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});

async function testImporter(t: MetaTest, name: string, testQuery?: Q) {
  const file = `importers/copy/${name}.py`;

  await t.should("copy source typegraph definition", async () => {
    await copyFile(`importers/${name}_original.py`, file);
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
