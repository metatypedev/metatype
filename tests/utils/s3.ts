// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "aws-sdk/client-s3";
import { connect } from "redis";

export async function tryDeleteBucket(client: S3Client, bucket: string) {
  while (true) {
    const list = await listObjects(client, bucket);
    if (list == null) {
      return;
    }
    if (list.length === 0) {
      break;
    }

    for (const { Key } of list) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: Key! }));
    }
  }

  const deleteCommand = new DeleteBucketCommand({ Bucket: bucket });
  await client.send(deleteCommand);
}

export async function listObjects(client: S3Client, bucket: string) {
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

export async function createBucket(client: S3Client, bucket: string) {
  const createCommand = new CreateBucketCommand({ Bucket: bucket });
  await client.send(createCommand);
}

export async function hasObject(client: S3Client, bucket: string, key: string) {
  try {
    const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
    await client.send(headCommand);
    return true;
  } catch (e) {
    if (e.name === "NotFound") {
      return false;
    }
    throw e;
  }
}

export function generateSyncConfig(bucketName: string) {
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
    s3Bucket: bucketName,
  };

  const redisKey = "typegraph";
  const redisEventKey = "typegraph_event";
  const cleanUp = async () => {
    using redis = await connect(syncConfig.redis);
    await redis.del(redisKey);
    await redis.del(redisEventKey);

    const s3 = new S3Client(syncConfig.s3);
    await tryDeleteBucket(s3, syncConfig.s3Bucket);
    await createBucket(s3, syncConfig.s3Bucket);
    s3.destroy();
    await redis.quit();
  };

  return { syncConfig, cleanUp };
}
