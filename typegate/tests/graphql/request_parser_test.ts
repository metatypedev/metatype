// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { FormDataParser } from "../../src/graphql/request_parser.ts";
import { gql, test } from "../utils.ts";
import * as mf from "test/mock_fetch";
import { assertEquals, assertExists } from "std/testing/asserts.ts";

mf.install();

test("request parser: multipart/form-data", async (t) => {
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
        file: null,
      })
      .withFile(
        new File(
          [fileContent],
          "hello.txt",
        ),
        ["variables.file"],
      );
    const req = await q.getRequest("http://localhost/api/graphql");

    const res = await fetch(req);
    await res.text();

    assertExists(request, "request");
    const data = await request.formData();
    const operations = new FormDataParser(data).parse();
    assertEquals(operations.query, q.query);
    assertExists(operations.variables.file);
    assertEquals(fileContent, await (operations.variables.file as File).text());

    console.log({ operations });
  });
});
