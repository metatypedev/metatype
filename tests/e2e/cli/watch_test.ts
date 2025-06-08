// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import { assert } from "@std/assert";
import { Meta } from "test-utils/mod.ts";
import type { MetaTest } from "test-utils/test.ts";
import { makeMetaCliTest } from "test-utils/meta.ts";

const typegraphConfig = `
typegraphs:
  typescript:
    include: "api/deps.ts"`;

async function setupDirectory(t: MetaTest, dir: string) {
  console.log("Preparing test directory...");

  await t.shell([
    "bash",
    "-c",
    `
    rm -rf ./tmp && mkdir -p tmp/deps
    meta new --template python ${dir}
    cp ./e2e/cli/typegraphs/deps.ts ${path.join(dir, "api")}
    cp ./e2e/cli/typegraphs/deps.ts ${path.join(dir, "api", "excluded.ts")}
    cp ./e2e/cli/artifacts/ops.ts ${path.join(dir, "deps", "ops.ts")}
    echo "${typegraphConfig}" >> ${path.join(dir, "metatype.yaml")}
    `,
  ]);
}

Meta.test({ name: "meta dev: watch typegraphs" }, async (t) => {
  const targetDir = path.join(t.workingDir, "tmp");

  await setupDirectory(t, targetDir);

  const { expectStderr, stderr } = makeMetaCliTest(t, targetDir, [
    "dev",
    `--gate=http://localhost:${t.port}`,
  ]);

  await t.should("deploy typegraphs", async () => {
    // order is not deterministic but there should be two
    await expectStderr("successfully deployed typegraph");
    await expectStderr("successfully deployed typegraph");
  });

  await t.should("watch modified typegraph", async () => {
    await t.shell(["bash", "-c", "echo '' >> api/example.py"], {
      currentDir: targetDir,
    });

    await expectStderr('File modified: "api/example.py"');
  });

  await t.should("re-deploy typegraph", () =>
    expectStderr("successfully deployed typegraph example"),
  );

  await t.should("ignore excluded typegraph", async () => {
    await t.shell(["bash", "-c", "echo '' >> api/excluded.ts"], {
      currentDir: targetDir,
    });

    const lines: string[] = [];

    try {
      await stderr.readWhile((line) => {
        lines.push(line);
        return true;
      }, 3000);
    } catch (_) {
      // timeout error
    } finally {
      assert(!lines.join("\n").includes("api/excluded.ts"));
    }
  });
});

Meta.test({ name: "meta dev: watch metatype.yaml" }, async (t) => {
  const targetDir = path.join(t.workingDir, "tmp");

  const { expectStderr } = makeMetaCliTest(t, targetDir, [
    "dev",
    `--gate=http://localhost:${t.port}`,
  ]);

  await t.should("deploy typegraphs", async () => {
    await expectStderr("successfully deployed typegraph");
    await expectStderr("successfully deployed typegraph");
  });

  await t.should("watch modified configuration", async () => {
    await t.shell(["bash", "-c", "echo '' >> metatype.yaml"], {
      currentDir: targetDir,
    });

    await expectStderr("metatype configuration file changed");
  });

  await t.should("start restart process", async () => {
    await expectStderr("reloading all the typegraphs");
    await expectStderr("force stopping active tasks");
    await expectStderr("starting discovery");
  });

  await t.should("re-deploy all typegraphs", async () => {
    await expectStderr("successfully deployed typegraph");
    await expectStderr("successfully deployed typegraph");
  });
});

Meta.test({ name: "meta dev: watch artifacts" }, async (t) => {
  const targetDir = path.join(t.workingDir, "tmp");

  const { expectStderr } = makeMetaCliTest(t, targetDir, [
    "dev",
    `--gate=http://localhost:${t.port}`,
  ]);

  await t.should("upload artifact", () =>
    expectStderr("artifact uploaded: ../deps/ops.ts"),
  );
  await t.should("deploy typegraph", () =>
    expectStderr("successfully deployed typegraph deps"),
  );
  await t.should("watch modified artifact", async () => {
    await t.shell(["bash", "-c", "echo '' >> deps/ops.ts"], {
      currentDir: targetDir,
    });

    await expectStderr('File modified: "deps/ops.ts"');
    await expectStderr("-> api/deps.ts");
  });

  await t.should("re-upload artifact", () =>
    expectStderr("artifact uploaded: ../deps/ops.ts"),
  );

  await t.should("re-deploy typegraph", () =>
    expectStderr("successfully deployed typegraph deps"),
  );

  await t.shell(["rm", "-rf", targetDir]);
});
