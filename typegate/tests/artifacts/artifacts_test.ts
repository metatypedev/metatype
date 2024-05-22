// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { MetaTest } from "test-utils/test.ts";
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/join.ts";
import { exists } from "std/fs/exists.ts";
import { assert, assertFalse } from "std/assert/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, hasObject, tryDeleteBucket } from "test-utils/s3.ts";
import {
  REDIS_REF_COUNTER,
  resolveS3Key,
} from "@typegate/typegate/artifacts/shared.ts";

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
  s3Bucket: "artifact-sync-test",
};

async function cleanUp() {
  using redis = await connect(syncConfig.redis);
  await redis.del(REDIS_REF_COUNTER);

  const s3 = new S3Client(syncConfig.s3);
  await tryDeleteBucket(s3, syncConfig.s3Bucket);
  await createBucket(s3, syncConfig.s3Bucket);
  s3.destroy();
  await redis.quit();
}

const variants = [
  { nameSuffix: "" },
  {
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
    nameSuffix: " (sync)",
  },
] as const;

async function hasArtifact(t: MetaTest, hash: string, sync: boolean) {
  if (sync) {
    const s3 = new S3Client(syncConfig.s3);
    const res = await hasObject(
      s3,
      syncConfig.s3Bucket,
      resolveS3Key(syncConfig.s3Bucket, hash),
    );
    s3.destroy();
    return res;
  } else {
    return await exists(join(t.tempDir, "artifacts-cache", hash));
  }
}

for (const { nameSuffix, ...options } of variants) {
  Meta.test({
    name: "Upload protocol" + nameSuffix,
    ...options,
  }, async (t) => {
    const e = await t.engine("runtimes/deno/deno.py");
    const artifacts = e.tg.tg.meta.artifacts;

    await t.should("have uploaded artifacts on deploy", async () => {
      for (const [_, meta] of Object.entries(artifacts)) {
        assert(await hasArtifact(t, meta.hash, "syncConfig" in options));
      }
    });

    await t.undeploy(e.name);

    await t.should("have removed artifacts on undeploy", async () => {
      for (const [_, meta] of Object.entries(artifacts)) {
        assertFalse(await hasArtifact(t, meta.hash, "syncConfig" in options));
      }
    });
  });

  Meta.test({
    name: "Upload protocol: tg_deploy (NodeJs SDK)" + nameSuffix,
    ...options,
  }, async (_t) => {
    // TODO
  });

  Meta.test({
    name: "Upload protocol: tg_deploy (Python SDK)" + nameSuffix,
    ...options,
  }, async (t) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/deno/deploy_deno.py",
      join(testDir, "runtimes/deno"),
    );
    const artifacts = e.tg.tg.meta.artifacts;

    await t.should("have uploaded artifacts on deploy", async () => {
      for (const [_, meta] of Object.entries(artifacts)) {
        assert(await hasArtifact(t, meta.hash, "syncConfig" in options));
      }
    });

    await t.undeploy(e.name);

    await t.should("have removed artifacts on undeploy", async () => {
      for (const [_, meta] of Object.entries(artifacts)) {
        assertFalse(await hasArtifact(t, meta.hash, "syncConfig" in options));
      }
    });
  });

  Meta.test({
    name: "Artifact GC: shared artifacts" + nameSuffix,
    ...options,
  }, async (t) => {
    const engine = await t.engine("runtimes/deno/deno.py");
    const artifacts = engine.tg.tg.meta.artifacts;

    const enginePartial = await t.engine("runtimes/deno/deno_partial.py");
    const sharedArtifacts = Object.keys(enginePartial.tg.tg.meta.artifacts)
      .filter((art) => art in artifacts);

    await t.undeploy(engine.name);

    await t.should("have removed shared artifacts", async () => {
      for (const [art, meta] of Object.entries(artifacts)) {
        if (sharedArtifacts.includes(art)) {
          assert(await hasArtifact(t, meta.hash, "syncConfig" in options));
        } else {
          assertFalse(await hasArtifact(t, meta.hash, "syncConfig" in options));
        }
      }
    });

    await t.undeploy(enginePartial.name);

    await t.should("have removed all artifacts", async () => {
      for (const [_, meta] of Object.entries(artifacts)) {
        assertFalse(
          await hasArtifact(t, meta.hash, "syncConfig" in options),
        );
      }
    });
  });
}
