// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ArtifactMeta } from "../../typegate/artifacts/mod.ts";
import type { Artifact } from "../../typegraph/types.ts";

export function createArtifactMeta(
  typegraphName: string,
  artifact: Artifact,
): ArtifactMeta {
  return {
    typegraphName,
    hash: artifact.hash,
    sizeInBytes: artifact.size,
    relativePath: artifact.path,
  };
}
