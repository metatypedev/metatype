// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta, sleep } from "../../utils/mod.ts";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsCommand,
  S3Client,
} from "aws-sdk/client-s3";
import { TestModule } from "test-utils/test_module.ts";
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/mod.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

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

const apolloDir = join(testDir, "e2e", "nextjs", "apollo");

function startNextServer() {
  const command = new Deno.Command("pnpm", {
    args: ["run", "dev", "-p", `${nextjsPort}`],
    cwd: apolloDir,
    stderr: "piped",
    stdout: "piped",
  });
  return command.spawn();
}

const port = 7893;
const nextjsPort = 3123;
const envs = {
  TG_APOLLO_HOST: HOST,
  TG_APOLLO_REGION: REGION,
  TG_APOLLO_ACCESS_KEY: ACCESS_KEY,
  TG_APOLLO_SECRET_KEY: SECRET_KEY,
  TG_APOLLO_PATH_STYLE: PATH_STYLE,
};

async function deployTypegraph() {
  Object.entries(envs).forEach(([k, v]) => {
    Deno.env.set(k, v);
  });

  const output = await m.cli(
    {},
    "deploy",
    "--target",
    `dev${port}`,
    "-f",
    "typegraph/apollo.py",
    "--allow-dirty",
  );

  console.log("deploy output stdout", output.stdout);
  console.log("deploy output stderr", output.stderr);
}

async function undeployTypegraph() {
  Object.keys(envs).forEach((k) => {
    Deno.env.delete(k);
  });

  await m.cli(
    {},
    "undeploy",
    "--target",
    `dev${port}`,
    "--typegraph",
    "apollo",
  );
}

Meta.test("apollo client", async (t) => {
  await initBucket();
  await deployTypegraph();

  // install nextjs app
  const install = await t.shell(["pnpm", "install"], {
    currentDir: apolloDir,
  });
  console.log("Nextjs initialization", install);

  // start nextjs app
  const proc = startNextServer();
  console.log("Start Nextjs server PID", proc.pid);

  const waitMs = 10000;
  console.log("Waiting", waitMs / 1000, "seconds");
  await sleep(waitMs);

  try {
    const url = `http://localhost:${nextjsPort}/api/apollo`;
    console.log("Fetch", url);
    const res = await fetch(url);
    const jsonResponse = await res.json();

    console.log("Nextjs API response", jsonResponse);
    assertEquals(jsonResponse, { success: { data: { uploadMany: true } } });
  } catch (err) {
    throw err;
  } finally {
    await proc.stdout.cancel();
    await proc.stderr.cancel();
    proc.kill();
  }

  await undeployTypegraph();
}, { port, systemTypegraphs: true, introspection: true });
