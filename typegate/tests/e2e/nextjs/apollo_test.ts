// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../../utils/mod.ts";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsCommand,
  S3Client,
} from "aws-sdk/client-s3";
import { TestModule } from "test-utils/test_module.ts";
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/mod.ts";

const HOST = "http://localhost:9000";
const REGION = "local";
const ACCESS_KEY = "minio";
const SECRET_KEY = "password";
const PATH_STYLE = "true";

const m = new TestModule(import.meta);

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

function startNextServer() {
  const command = new Deno.Command("bash", {
    args: ["./server.sh"],
    cwd: join(testDir, "e2e", "nextjs"),
    stderr: "piped",
    stdout: "piped",
  });
  return command.spawn();
}

const port = 7897;

Meta.test("apollo client", async (t) => {
  await initBucket();
  const out = await m.cli(
    {},
    "doctor",
  );

  console.log("OUTOUT", out.stdout);

  await m.cli(
    {
      env: {
        HOST: HOST,
        REGION: REGION,
        ACCESS_KEY: ACCESS_KEY,
        SECRET_KEY: SECRET_KEY,
        PATH_STYLE: PATH_STYLE,
      },
    },
    "deploy",
    "--target",
    `dev${port}`,
    "-f",
    "typegraph/apollo.py",
    "--allow-dirty",
  );

  // non blocking
  const proc = startNextServer();

  console.log("PID", proc.pid);

  const res = await fetch("http://localhost:3000/api/apollo");
  console.log("OUTPUT", await res.json());

  await proc.stdout.cancel();
  await proc.stderr.cancel();
  proc.kill();
}, { port });

Meta.test("meta undeploy", async (t) => {
  await t.should("free resources", async () => {
    await m.cli(
      {},
      "undeploy",
      "--target",
      `dev${port}`,
      "--typegraph",
      "apollo-test",
    );
  });
}, { port, systemTypegraphs: true });
