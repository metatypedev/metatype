// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { FormDataParser } from "../../src/graphql/request_parser.ts";
import { gql, Meta } from "../utils/mod.ts";
import * as mf from "test/mock_fetch";
import { assertEquals, assertExists } from "std/assert/mod.ts";

mf.install();

Meta.test("request parser: multipart/form-data", async (t) => {
  let request: Request | null = null;
  mf.mock("POST@/api/graphql", (req) => {
    request = req;
    return new Response("");
  });

  await t.should("successfully query with file", async () => {
    const fileContent = "Hello, World!";
    const q = gql`
        mutation($file: File!) {
          singleUpload(file: $file) { url }
        }
      `
      .withVars({
        file: new File(
          [fileContent],
          "hello.txt",
        ),
      });
    const req = await q.getRequest("http://localhost/api/graphql");

    const res = await fetch(req);
    await res.text();

    assertExists(request, "request");
    const data = await request.formData();
    const operations = new FormDataParser(data).parse();
    assertEquals(operations.query, q.query);
    assertExists(operations.variables.file);
    assertEquals(fileContent, await (operations.variables.file as File).text());
  });
});
