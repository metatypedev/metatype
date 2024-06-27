// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  MdkConfig,
  MdkOutput,
  SerializeParams,
} from "./gen/typegraph_core.d.ts";
import { TypegraphOutput } from "./typegraph.ts";
import { wit_utils } from "./wit.ts";
import { freezeTgOutput } from "./utils/func_utils.ts";

export class Metagen {
  constructor(private workspacePath: string, private genConfig: unknown) {}

  private getMdkConfig(tgOutput: TypegraphOutput, targetName: string) {
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
      targetName,
      workspacePath: this.workspacePath,
    } as MdkConfig;
  }

  dryRun(tgOutput: TypegraphOutput, targetName: string, overwrite?: false) {
    const mdkConfig = this.getMdkConfig(tgOutput, targetName);
    return wit_utils.metagenExec(mdkConfig).map((value: any) => ({
      ...value,
      overwrite: overwrite ?? value.overwrite,
    })) as Array<MdkOutput>;
  }

  run(tgOutput: TypegraphOutput, targetName: string, overwrite?: false) {
    const items = this.dryRun(tgOutput, targetName, overwrite);
    wit_utils.metagenWriteFiles(items, this.workspacePath);
  }
}
