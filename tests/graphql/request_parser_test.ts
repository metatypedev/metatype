// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { FormDataParser } from "@metatype/typegate/transports/graphql/request_parser.ts";
import { gql, Meta } from "../utils/mod.ts";
import * as mf from "test/mock_fetch";
import { assertEquals, assertExists } from "@std/assert";

mf.install();

Meta.test("request parser: multipart/form-data", async (t) => {
  const crypto = t.typegate.cryptoKeys;
  let request: Request | null = null;
  mf.mock("POST@/api/graphql", (req) => {
    request = req;
    return new Response("");
  });

  await t.should("successfully query with file", async () => {
    const fileContent = "Hello, World!";
    const q = gql`
      mutation ($file: File!) {
        singleUpload(file: $file) {
          url
        }
      }
    `.withVars({
      file: new File([fileContent], "hello.txt"),
    });
    const req = await q.getRequest("http://localhost/api/graphql", crypto);

    const res = await fetch(req);
    await res.text();

    assertExists(request, "request");
    const data = await request!.formData();
    const operations = new FormDataParser(data).parse();
    assertEquals(operations.query, q.query);
    assertExists(operations.variables.file);
    assertEquals(fileContent, await (operations.variables.file as File).text());
  });
});
