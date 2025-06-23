// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { MetaTest } from "test-utils/test.ts";
import { $ } from "@local/tools/deps.ts";
import { downloadAndExtractCli } from "./utils.ts";
import { newTempDir } from "test-utils/dir.ts";

type PreludeStepsOutput = {
  publishedBin: string;
  examplesDir: string;
};

export async function downloadSteps(
  t: MetaTest,
  version: string,
): Promise<PreludeStepsOutput> {
  let publishedBin = "";
  await t.should(
    `download published cli (fat version) v${version}`,
    async () => {
      publishedBin = await downloadAndExtractCli(version);
    },
  );

  const repoDir = await newTempDir();
  const examplesDir = $.path(
    await newTempDir({
      dir: undefined,
    }),
  );

  await t.should(
    "download example typegraphs for the published version",
    async () => {
      const tag = `v${version}`;
      // FIXME: cache across test runs
      await $`git clone https://github.com/metatypedev/metatype.git --depth 1 --branch ${tag}`
        .cwd(repoDir)
        .stdout("piped")
        .stderr("piped")
        .printCommand();

      await $.path(repoDir).join("metatype/examples").copy(examplesDir, {
        overwrite: true,
      });
    },
  );

  return {
    publishedBin,
    examplesDir: examplesDir.toString(),
  };
}
