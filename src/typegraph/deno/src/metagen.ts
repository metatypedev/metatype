// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { SerializeParams } from "./gen/core.ts";
import { TypegraphOutput } from "./typegraph.ts";
import { sdkUtils } from "./sdk.ts";
import { freezeTgOutput } from "./utils/func_utils.ts";
import { FdkConfig, FdkOutput } from "./gen/utils.ts";

export class Metagen {
  constructor(
    private workspacePath: string,
    private genConfig: unknown,
  ) {}

  private getFdkConfig(tgOutput: TypegraphOutput, targetName: string) {
    const serializeParams = {
      typegraphPath: `${this.workspacePath}/tg.ts`,
      prefix: undefined,
      artifactResolution: false,
      codegen: true,
      prismaMigration: {
        migrationsDir: "prisma-migrations",
        migrationActions: [],
        defaultMigrationAction: {
          apply: false,
          create: false,
          reset: false,
        },
      },
      pretty: false,
    } satisfies SerializeParams;
    const frozenOut = freezeTgOutput(serializeParams, tgOutput);
    return {
      configJson: JSON.stringify(this.genConfig),
      tgJson: frozenOut.serialize(serializeParams).tgJson,
      targetName: targetName,
      workspacePath: this.workspacePath,
    } as FdkConfig;
  }

  /** dry-run metagen */
  dryRun(
    tgOutput: TypegraphOutput,
    targetName: string,
    overwrite?: false,
  ): Array<FdkOutput> {
    const fdkConfig = this.getFdkConfig(tgOutput, targetName);
    return sdkUtils.metagenExec(fdkConfig).map((value: any) => ({
      ...value,
      overwrite: overwrite ?? value.overwrite,
    })) as Array<FdkOutput>;
  }

  /** run metagen */
  run(tgOutput: TypegraphOutput, targetName: string, overwrite?: false) {
    const items = this.dryRun(tgOutput, targetName, overwrite);
    sdkUtils.metagenWriteFiles(items, this.workspacePath);
  }
}
