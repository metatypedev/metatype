// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import { Meta } from "test-utils/mod.ts";
import { MetaTest } from "test-utils/test.ts";
import { killProcess, Lines } from "test-utils/process.ts";

const typegraphConfig = `
typegraphs:
  typescript:
    include: "api/example.ts"`;

async function setupDirectory(t: MetaTest, dir: string) {
  await t.shell([
    "bash",
    "-c",
    `
    rm -rf ./tmp && mkdir -p tmp/deps
    meta new --template deno ${dir}
    cp ./e2e/cli/typegraphs/deps.ts ${path.join(dir, "api", "example.ts")}
    cp ./e2e/cli/artifacts/ops.ts ${path.join(dir, "deps", "ops.ts")}
    echo "${typegraphConfig}" >> ${path.join(dir, "metatype.yaml")}
    `,
  ]);
}

Meta.test({ name: "meta dev: watch artifacts" }, async (t) => {
  const targetDir = path.join(t.workingDir, "tmp");

  console.log("Preparing test directory...");

  await setupDirectory(t, targetDir);

  const metadev = new Deno.Command("meta", {
    cwd: targetDir,
    args: ["dev", `--gate=http://localhost:${t.port}`],
    stderr: "piped",
  }).spawn();

  const stderr = new Lines(metadev.stderr);

  await t.should("upload artifact", async () => {
    await stderr.readWhile((line) => !line.includes("artifact uploaded"));
  });

  await t.should("deploy typegraph", async () => {
    await stderr.readWhile(
      (line) => !line.includes("successfully deployed typegraph"),
    );
  });

  await t.shell(["bash", "-c", "echo '' >> deps/ops.ts"], {
    currentDir: targetDir,
  });

  await t.should("watch modified file", async () => {
    await stderr.readWhile((line) => !line.includes("File modified"));
  });

  await t.should("re-upload artifact", async () => {
    await stderr.readWhile((line) => !line.includes("artifact uploaded"));
  });

  await t.should("re-deploy typegraph", async () => {
    await stderr.readWhile(
      (line) => !line.includes("successfully deployed typegraph"),
    );
  });

  t.addCleanup(async () => {
    await stderr.close();
    await killProcess(metadev);
    await t.shell(["rm", "-rf", targetDir]);
  });
});
