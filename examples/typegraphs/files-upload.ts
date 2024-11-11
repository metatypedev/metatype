import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { S3Runtime } from "@typegraph/sdk/providers/aws.ts";

await typegraph(
  {
    name: "files-upload",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const s3 = new S3Runtime({
      hostSecret: "S3_HOST",
      regionSecret: "S3_REGION",
      accessKeySecret: "S3_ACCESS_KEY",
      secretKeySecret: "S3_SECRET_KEY",
      pathStyleSecret: "S3_PATH_STYLE",
    });

    g.expose(
      {
        listObjects: s3.list("examples"),
        getDownloadUrl: s3.presignGet({ bucket: "examples" }),
        signUploadUrl: s3.presignPut({ bucket: "examples" }),
        upload: s3.upload(
          "examples",
          t.file({ allow: ["image/png", "image/jpeg"] }),
        ),
        uploadMany: s3.uploadAll("examples"),
      },
      Policy.public(),
    );
  },
);
