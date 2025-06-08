// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// Modified from
// https://github.com/aws/aws-sdk-js-v3/blob/d1501040077b937ef23e591238cda4bbe729c721/supplemental-docs/MD5_FALLBACK.mdkk
import { S3Client, S3ClientConfig } from "aws-sdk/client-s3";
// import {
//   S3Client,
//   S3ClientConfig,
// } from "npm:@aws-sdk/client-s3@3.821.0";
// import { createHash } from "node:crypto";
// import { Buffer } from "node:buffer";

/**
 * Creates an S3 client that uses MD5 checksums for DeleteObjects operations
 */
export function createS3ClientWithMD5(config?: S3ClientConfig) {
  return new S3Client({
    ...config,
    requestStreamBufferSize: 32 * 1024,
  });
  /*
  const client = new S3Client({
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    ...config,
  });

  const cb =
    // deno-lint-ignore no-explicit-any
    (next: any, context: any) => async (args: any) => {
      // Check if this is a DeleteObjects command
      const isDeleteObjects = context.commandName === "DeleteObjectsCommand";

      if (!isDeleteObjects) {
        return next(args);
      }

      console.log({ args });
      const headers = args.request.headers;

      // Remove any checksum headers added by default middleware
      // This ensures our Content-MD5 is the primary integrity check
      Object.keys(headers).forEach((header) => {
        const lowerHeader = header.toLowerCase();
        if (
          lowerHeader.startsWith("x-amz-checksum-") ||
          lowerHeader.startsWith("x-amz-sdk-checksum-")
        ) {
          delete headers[header];
        }
      });

      // Add Content-MD5 header
      if (args.request.body) {
        const bodyContent = Buffer.from(args.request.body);
        headers["Content-MD5"] = createHash("md5").update(bodyContent).digest(
          "base64",
        );
      }

      return await next(args);
    };

  // Add the middleware relative to the flexible checksums middleware
  // This ensures it runs after default checksums might be added, but before signing
  client.middlewareStack.addRelativeTo(
    cb,
    {
      relation: "after",
      toMiddleware: "flexibleChecksumsMiddleware",
      name: "addMD5ChecksumForDeleteObjects", // Optional: Name it whatever you'd like
      tags: ["MD5_FALLBACK"],
    },
  );

  return client;
  */
}
