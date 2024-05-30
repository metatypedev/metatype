// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import { freezeTgOutput } from "./utils/func_utils.js";
import {
  MdkConfig,
  MdkOutput,
} from "./gen/interfaces/metatype-typegraph-utils.js";

const codegenArtefactConfig = {
  prismaMigration: {
    globalAction: {
      create: false,
      reset: false,
    },
    migrationDir: ".",
  },
  disableArtifactResolution: true,
} as ArtifactResolutionConfig;

export class Metagen {
  constructor(private workspacePath: string, private genConfig: unknown) {}

  private getMdkConfig(
    tgOutput: TypegraphOutput,
    targetName: string,
  ) {
    const frozenOut = freezeTgOutput(codegenArtefactConfig, tgOutput);
    return {
      configJson: JSON.stringify(this.genConfig),
      tgJson: frozenOut.serialize(codegenArtefactConfig).tgJson,
      targetName,
      workspacePath: this.workspacePath,
    } as MdkConfig;
  }

  dryRun(tgOutput: TypegraphOutput, targetName: string, overwrite?: false) {
    const mdkConfig = this.getMdkConfig(tgOutput, targetName);
    return wit_utils.metagenExec(mdkConfig)
      .map((value) => ({
        ...value,
        overwrite: overwrite ?? value.overwrite,
      })) as Array<MdkOutput>;
  }

  run(tgOutput: TypegraphOutput, targetName: string, overwrite?: false) {
    const items = this.dryRun(tgOutput, targetName, overwrite);
    wit_utils.metagenWriteFiles(items);
  }
}
