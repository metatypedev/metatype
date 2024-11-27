// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { S3Runtime } from "@typegraph/sdk/providers/aws.ts";

typegraph("s3", (g: any) => {
  const pub = Policy.public();

  const s3 = new S3Runtime({
    hostSecret: "HOST",
    regionSecret: "REGION",
    accessKeySecret: "access_key",
    secretKeySecret: "secret_key",
    pathStyleSecret: "PATH_STYLE",
  });

  g.expose(
    {
      listObjects: s3.list("bucket"),
      getDownloadUrl: s3.presignGet({ bucket: "bucket" }),
      signTextUploadUrl: s3.presignPut({
        bucket: "bucket",
        contentType: "text/plain",
      }),
      upload: s3.upload("bucket", t.file({ allow: ["text/plain"] })),
      uploadMany: s3.uploadAll("bucket"),
    },
    pub,
  );
});
