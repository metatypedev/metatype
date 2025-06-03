// Modified from https://github.com/aws/aws-sdk-js-v3/blob/a1d8ad3ef4c5c9846a7ea80cde914e93721f32ca/supplemental-docs/MD5_FALLBACK.md
import { S3Client, S3ClientConfig } from "aws-sdk/client-s3";
import { createHash } from "node:crypto";

/**
 * Creates an S3 client that uses MD5 checksums for DeleteObjects operations
 */
export function createS3ClientWithMD5(config?: S3ClientConfig) {
  const client = new S3Client({
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    ...config,
  });
  const md5Hash = createHash("md5");

  client.middlewareStack.add(
    (next, context) => async (args) => {
      // Check if this is a DeleteObjects command
      const isDeleteObjects = context.commandName === "DeleteObjectsCommand";

      if (!isDeleteObjects) {
        return next(args);
      }

      const result = await next(args);
      // deno-lint-ignore no-explicit-any
      const headers = (args.request as any).headers;

      // Remove any checksum headers
      Object.keys(headers).forEach((header) => {
        if (
          header.toLowerCase().startsWith("x-amz-checksum-") ||
          header.toLowerCase().startsWith("x-amz-sdk-checksum-")
        ) {
          delete headers[header];
        }
      });

      // Add MD5
      // deno-lint-ignore no-explicit-any
      if ((args.request as any).body) {
        const bodyContent = new TextEncoder().encode(
          // deno-lint-ignore no-explicit-any
          (args.request as any).body,
        );
        headers["Content-MD5"] = md5Hash.update(bodyContent).digest("base64");
      }

      return result;
    },
    {
      step: "finalizeRequest",
      name: "addMD5Checksum",
    },
  );

  return client;
}
