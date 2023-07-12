// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { copyFile, gql, Meta } from "../utils/mod.ts";
import * as mf from "test/mock_fetch";
import { GraphQLQuery } from "../utils/query/graphql_query.ts";
import { MetaTest } from "../utils/test.ts";
import { shell } from "../utils/shell.ts";

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

async function testImporter(
  t: MetaTest,
  name: string,
  testQuery?: GraphQLQuery,
) {
  const file = `importers/copy/${name}.py`;

  await t.should("copy source typegraph definition", async () => {
    await copyFile(`importers/${name}_original.py`, file);
  });

  await t.should("run the importer", async () => {
    await shell(["python3", file]);
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

Meta.test("GraphQL importer", async (t) => {
  await testImporter(
    t,
    "gql",
    gql`
      query {
        mutationPrevalenceSubtypes {
          name
        }
      }
    `,
  );
});

Meta.test("OpenAPI importer", async (t) => {
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
