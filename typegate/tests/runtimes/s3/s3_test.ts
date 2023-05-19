// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { gql, test } from "../../utils.ts";

test("s3", async (t) => {
  const e = await t.pythonFile("runtimes/s3/s3.py", {
    secrets: {
      TG_S3_TEST_ACCESS_KEY: "minio",
      TG_S3_TEST_SECRET_KEY: "password",
    },
  });

  const fileContent = "Hello, World!";

  await t.should("upload file successfully", async () => {
    await gql`
      mutation ($file: File!, $path: String!) {
        upload(file: $file, path: $path)
      }
    `
      .withVars({
        file: null,
        path: "hello.txt",
      })
      .withFile(
        new File(
          [fileContent],
          "hello.txt",
          { type: "text/plain" },
        ),
        ["variables.file"],
      )
      .expectData({
        upload: "hello.txt",
      })
      .on(e);
  });

  await t.should("download file successfully", async () => {
    let url: URL = null!;
    await gql`
      query ($path: String!) {
        getDownloadUrl(path: $path)
      }
    `
      .withVars({
        path: "hello.txt",
      })
      .expectBody((body) => {
        assertExists(body.data);
        url = new URL(body.data.getDownloadUrl);
        assertEquals(url.pathname, "/bucket/hello.txt");
      })
      .on(e);

    assertExists(url);
    const res = await fetch(url);
    const text = await res.text();
    assertEquals(text, fileContent);
  });
});
