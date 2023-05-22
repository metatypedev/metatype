// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { assertEquals, assertExists } from "std/testing/asserts.ts";
import { gql, test } from "../../utils.ts";
import { CreateBucketCommand, S3Client } from "aws-sdk/client-s3";

const ACCESS_KEY = "minio";
const SECRET_KEY = "password";

async function initBucket() {
  const client = new S3Client({
    endpoint: "http://localhost:9000",
    region: "local",
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    forcePathStyle: true,
  });

  try {
    const command = new CreateBucketCommand({
      Bucket: "bucket",
    });
    await client.send(command);
  } catch (_e) {
    //
  }
}

test("s3", async (t) => {
  const e = await t.pythonFile("runtimes/s3/s3.py", {
    secrets: {
      TG_S3_TEST_ACCESS_KEY: ACCESS_KEY,
      TG_S3_TEST_SECRET_KEY: SECRET_KEY,
    },
  });

  await initBucket();

  const fileContent = "Hello, World!";

  await t.should("upload file successfully", async () => {
    await gql`
      mutation ($file: File!, $path: String!) {
        upload(file: $file, path: $path)
      }
    `
      .withVars({
        file: new File(
          [fileContent],
          "hello.txt",
          { type: "text/plain" },
        ),
        path: "hello.txt",
      })
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

  const fileContent2 = "Hello, World from presigned URL!";

  await t.should("upload file with presigned url", async () => {
    let url: URL = null!;
    await gql`
      query ($path: String!, $length: Int!) {
        signTextUploadUrl(path: $path, length: $length)
      }
    `
      .withVars({
        path: "hello2.txt",
        length: fileContent2.length,
      })
      .expectBody((body) => {
        assertExists(body.data);
        url = new URL(body.data.signTextUploadUrl);
        assertEquals(url.pathname, "/bucket/hello2.txt");
      })
      .on(e);

    assertExists(url);

    const res = await fetch(url, {
      method: "PUT",
      body: fileContent2,
    });
    assertEquals(res.status, 200);
    await res.arrayBuffer();

    let url2: URL = null!;
    await gql`
      query ($path: String!) {
        getDownloadUrl(path: $path)
      }
    `
      .withVars({
        path: "hello2.txt",
      })
      .expectBody((body) => {
        assertExists(body.data);
        url2 = new URL(body.data.getDownloadUrl);
        assertEquals(url2.pathname, "/bucket/hello2.txt");
      })
      .on(e);

    assertExists(url);
    const res2 = await fetch(url2);
    const text = await res2.text();
    assertEquals(text, fileContent2);
  });

  await t.should("list uploaded objects", async () => {
    await gql`
      query ($path: String!) {
        listObjects(path: $path) {
          keys { key size }
          prefix
        }
      }
    `
      .withVars({
        path: "/",
      })
      .expectData({
        listObjects: {
          keys: [
            { key: "hello.txt", size: fileContent.length },
            { key: "hello2.txt", size: fileContent2.length },
          ],
          prefix: [""],
        },
      })
      .on(e);
  });
});
