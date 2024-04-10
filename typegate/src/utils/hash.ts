// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Hash } from "node:crypto";

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
