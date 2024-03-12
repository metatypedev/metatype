// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { connect } from "redis";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "aws-sdk/client-s3";

const syncConfig = {
  redis: {
    hostname: "localhost",
    port: 6379,
    password: "password",
    db: 1,
  },
  s3: {
    endpoint: "http://localhost:9000",
    region: "local",
    credentials: {
      accessKeyId: "minio",
      secretAccessKey: "password",
    },
    forcePathStyle: true,
  },
  s3Bucket: "metatype-sync-test",
};

async function tryDeleteBucket(client: S3Client, bucket: string) {
  while (true) {
    const list = await listObjects(client, bucket);
    if (list == null) {
      return;
    }
    if (list.length === 0) {
      break;
    }

    for (const { Key } of list) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: Key! }),
      );
    }
  }

  const deleteCommand = new DeleteBucketCommand({ Bucket: bucket });
  await client.send(deleteCommand);
}

async function listObjects(client: S3Client, bucket: string) {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
    });
    const res = await client.send(listCommand);
    return res.Contents ?? [];
  } catch (e) {
    if (e.name === "NoSuchBucket") {
      return null;
    }
    throw e;
  }
}

async function createBucket(client: S3Client, bucket: string) {
  const createCommand = new CreateBucketCommand({ Bucket: bucket });
  await client.send(createCommand);
}

async function resetS3() {
  const client = new S3Client(syncConfig.s3);
  await tryDeleteBucket(client, syncConfig.s3Bucket);
  await createBucket(client, syncConfig.s3Bucket);
  client.destroy();
}

const redisEventKey = "typegraph_event";

Meta.test("test sync through s3", async (t) => {
  await resetS3();

  await t.should("successfully send redis event", async () => {
    using redis = await connect(syncConfig.redis);
    const [lastMessage] = await redis.xrevrange(redisEventKey, "+", "-", 1);
    const lastId = lastMessage ? lastMessage.xid : 0;

    const _e = await t.engine("simple/simple.py");

    const [stream] = await redis.xread([{ key: redisEventKey, xid: lastId }], {
      block: 5000,
    });
    if (!stream) {
      throw new Error("timeout: no event received");
    }

    // await t.undeploy(e.name);
  });
}, {
  syncConfig,
});
