// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { newTempDir, workspaceDir } from "test-utils/dir.ts";
import { exists, expandGlob } from "std/fs/mod.ts";
import { join } from "std/path/mod.ts";
import { assert } from "std/assert/mod.ts";
import { get_version } from "native";
import { projectDir } from "../../../../dev/utils.ts";
// import { shell } from "test-utils/shell.ts";

const port = 7897;

const modifiers: Record<string, (dir: string) => Promise<void> | void> = {
  "python": () => {},
  "deno": async (dir: string) => {
    const version = await get_version();
    console.log(version);
    for await (const f of expandGlob("**/*.ts", { root: dir })) {
      const data = await Deno.readTextFile(f.path);
      const level = f.path.replace(projectDir, "").split("/").length - 1;
      const newData = data.replaceAll(
        `npm:@typegraph/sdk@${version}`,
        `${Array(level).fill("..").join("/")}/typegraph/deno/src`,
      );
      await Deno.writeTextFile(
        f.path,
        newData,
      );
    }
  },
  "node": async (_dir) => {
    // Method 1. the published version from npm is used

    // Method 2. install local module
    // should work once we have a `node` loader since
    // deno does not support file scheme yet
    // https://github.com/denoland/deno/issues/18474
    // await shell(["npm", "i", "../../typegraph/node"], {
    //   currentDir: dir,
    // });

    // Method 3. rewrite imports
    // const importMap = JSON.parse(
    //   await Deno.readTextFile("typegraph/node/package.json"),
    // );
    // for await (const f of expandGlob("**/*.ts", { root: dir })) {
    //   const data = await Deno.readTextFile(f.path);
    //   const newData = data.replace(
    //     /"@typegraph\/sdk\/?(.*)"/g,
    //     (match, chunk_) => {
    //       const chunk = chunk_ == "" ? "." : ("./" + chunk_);
    //       const importFile = importMap?.exports[chunk]?.import;
    //       console.log(chunk, "=>", importFile);
    //       if (importFile) {
    //         return `"../../../typegraph/node/${importFile.replace("./", "")}"`;
    //       }
    //       return match;
    //     },
    //   );
    //   await Deno.writeTextFile(
    //     f.path,
    //     newData,
    //   );
    // }
  },
};

for (const template of ["python", "deno", "node"]) {
  Meta.test(
    `${template} template`,
    async (t) => {
      const dir = await newTempDir();

      await t.should("should be extracted correctly", async () => {
        const out = await Meta.cli("new", "--template", template, dir);
        console.log(out.stdout);
        const source = join(workspaceDir, "examples/templates", template);
        const sourcesFiles = await Array.fromAsync(
          expandGlob("**/*", {
            root: source,
          }),
        );
        assert(sourcesFiles.length > 0);
        for (
          const f of sourcesFiles
        ) {
          const relPath = f.path.replace(source, "");
          assert(exists(join(dir, relPath)));
        }
      });

      await modifiers[template](dir);
      const out = await Meta.cli(
        { currentDir: dir },
        "deploy",
        "--target",
        "dev",
        "--gate",
        `http://localhost:${port}`,
        "--allow-dirty",
      );
      console.log(out);
    },
    { port, systemTypegraphs: true },
  );
}
