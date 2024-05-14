// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { TgFinalizationResult, TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import { freezeTgOutput } from "./utils/func_utils.js";

const codegenArtefactConfig = {
  prismaMigration: {
    globalAction: {
      create: false,
      reset: false,
    },
    migrationDir: ".",
  },
  // disableArtifactResolution: true,
  codegen: true,
} as ArtifactResolutionConfig;

export class Metagen {
  constructor(private workspacePath: string, private genConfig: unknown) {}
  run(tgOutput: TypegraphOutput, targetName: string, overwrite?: false) {
    const frozenOut = freezeTgOutput(codegenArtefactConfig, tgOutput);
    return wit_utils.metagenExec({
      configJson: JSON.stringify(this.genConfig),
      tgJson: frozenOut.serialize(codegenArtefactConfig).tgJson,
      targetName,
      workspacePath: this.workspacePath,
    }).map((value) => ({
      ...value,
      overwrite: overwrite ?? value.overwrite,
    }));
  }
}
