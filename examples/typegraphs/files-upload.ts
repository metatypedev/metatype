import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { S3Runtime } from "@typegraph/sdk/providers/aws.js";

typegraph({
  name: "retrend",
}, (g) => {
  const pub = Policy.public();

  const s3 = new S3Runtime({
    hostSecret: "S3_HOST",
    regionSecret: "S3_REGION",
    accessKeySecret: "S3_ACCESS_KEY",
    secretKeySecret: "S3_SECRET_KEY",
    pathStyleSecret: "S3_PATH_STYLE",
  });

  g.expose({
    listObjects: s3.list("bucket"),
    getDownloadUrl: s3.presignGet({ bucket: "bucket" }),
    signUploadUrl: s3.presignPut({ bucket: "bucket" }),
    upload: s3.upload("bucket", t.file({ allow: ["image/png", "image/jpeg"] })),
    uploadMany: s3.uploadAll("bucket"),
  }, pub);
});
