import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { S3Runtime } from "@typegraph/sdk/providers/aws.ts";

export const tg = await typegraph({
  name: "sample",
  builder(g) {
    const s3 = new S3Runtime({
      hostSecret: "S3_HOST",
      regionSecret: "S3_REGION",
      accessKeySecret: "S3_ACCESS_KEY",
      secretKeySecret: "S3_SECRET_KEY",
      pathStyleSecret: "S3_PATH_STYLE",
    });

    const bucket = "metagen-test-bucket";

    g.expose(
      {
        upload: s3.upload(
          bucket,
          t.file({ allow: ["text/plain"] }),
        ),
        uploadMany: s3.uploadAll(bucket, t.file({ allow: ["text/plain"] })),
      },
      Policy.public(),
    );
  },
}).catch((err) => {
  console.log(err);
  throw err;
});
