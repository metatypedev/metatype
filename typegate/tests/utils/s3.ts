// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "aws-sdk/client-s3";

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
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: Key! }),
      );
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
