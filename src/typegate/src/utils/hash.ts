// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// deno-lint-ignore no-external-import
import type { Hash } from "node:crypto";

export class HashTransformStream extends TransformStream {
  constructor(hash: Hash) {
    super({
      transform(chunk, controller) {
        hash.update(chunk);
        controller.enqueue(chunk);
      },
    });
  }
}
