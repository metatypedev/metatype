// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals, assertExists } from "std/assert/mod.ts";
import { execute, gql, Meta } from "../../utils/mod.ts";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsCommand,
  S3Client,
} from "aws-sdk/client-s3";

const HOST = "http://localhost:9000";
const REGION = "local";
const ACCESS_KEY = "minio";
const SECRET_KEY = "password";
const PATH_STYLE = "true";

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
    // bucket already exists
    const listCommand = new ListObjectsCommand({ Bucket: "bucket" });
    const res = await client.send(listCommand);

    if (res.Contents != null) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: "bucket",
        Delete: {
          Objects: res.Contents.map(({ Key }) => ({ Key })),
        },
      });
      await client.send(deleteCommand);
    }
  }
}

Meta.test("s3 typegraphs", async (t) => {
  await t.assertSameTypegraphs("runtimes/s3/s3.py", "runtimes/s3/s3.ts");
});

Meta.test("s3", async (t) => {
  const e = await t.engine("runtimes/s3/s3.py", {
    secrets: {
      HOST: HOST,
      REGION: REGION,
      ACCESS_KEY: ACCESS_KEY,
      SECRET_KEY: SECRET_KEY,
      PATH_STYLE: PATH_STYLE,
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
        upload: true,
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
    console.log("DOWNLOAD URL", url);
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

  await t.should("upload multiple files", async () => {
    await gql`
      mutation ($files: [File]!, $prefix: String!) {
        uploadMany(files: $files, prefix: $prefix)
      }
    `
      .withVars({
        files: [1, 2, 3, 4].map((i) =>
          new File([`hello #${i}`], `hello-${i}.txt`, { type: "text/plain" })
        ),
        prefix: "user/",
      })
      .expectData({
        uploadMany: true,
      })
      .on(e);

    await gql`
        query ($path: String!) {
          listObjects(path: $path) {
            keys { key, size }
            prefix
          }
        }
      `
      .withVars({
        path: "user/",
      })
      .expectData({
        listObjects: {
          keys: [1, 2, 3, 4].map((i) => ({
            key: `user/hello-${i}.txt`,
            size: 8,
          })),
          prefix: ["user/"],
        },
      })
      .on(e);
  });
});

Meta.test("s3 upload with fetch", async (t) => {
  const e = await t.engine("runtimes/s3/s3.py", {
    secrets: {
      HOST: HOST,
      REGION: REGION,
      ACCESS_KEY: ACCESS_KEY,
      SECRET_KEY: SECRET_KEY,
      PATH_STYLE: PATH_STYLE,
    },
  });

  await initBucket();

  const fileContent = "Hello World";
  const file = new File(
    [fileContent],
    "hello.txt",
    { type: "text/plain" },
  );

  const formData = new FormData();
  formData.append(
    "operations",
    JSON.stringify({
      query: `
        mutation ($file: File) {
          upload(file: $file)
        }
      `,
      variables: {
        file: null,
      },
    }),
  );
  formData.append("map", JSON.stringify({ 0: ["variables.file"] }));
  formData.append("0", new Blob([file], { type: "text/plain" }), "hello.txt");

  await t.should(
    "work with GraphQL multipart request",
    async () => {
      const req = new Request(`http://typegate.local/${e.name}`, {
        method: "POST",
        body: formData,
      });
      const res = await execute(e, req);
      assertEquals(await res.json(), { data: { upload: true } });
    },
  );
});
