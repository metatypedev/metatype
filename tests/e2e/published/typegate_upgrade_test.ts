// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { $ } from "@local/tools/deps.ts";
import { encodeBase64 } from "@std/encoding/base64";
import { newTempDir } from "test-utils/dir.ts";
import { Config } from "./config.ts";
import { downloadAndExtractCli } from "./utils.ts";
import { Lines } from "test-utils/process.ts";
import { assertEquals } from "@std/assert";
import { LATEST_RELEASE_VERSION } from "@local/tools/consts.ts";

// TODO remove after the next release
// The build.rs script now uses a META_CMD env var allowing us
// to use meta-old
const disabled: string[] = [
  "metagen-rs.ts",
];

const testConfig = new Config(13, "typegate-upgrade-test");

const previousVersion = LATEST_RELEASE_VERSION;

// This also tests the published NPM version of the SDK
Meta.test(
  {
    name: "typegate upgrade",
    async setup() {
      await testConfig.clearSyncData();
      await testConfig.setupSync();
    },
    async teardown() {
      await testConfig.clearSyncData();
    },
    ignore: previousVersion === "0.4.10",
  },
  async (t) => {
    let publishedBin = "";
    await t.should("download published cli (fat version)", async () => {
      publishedBin = await downloadAndExtractCli(previousVersion);
    });

    const metaBinDir = $.path(publishedBin).parent()!.toString();
    const tgSecret = encodeBase64(
      globalThis.crypto.getRandomValues(new Uint8Array(64)),
    );

    const typegateTempDir = await newTempDir();
    const repoDir = await newTempDir();
    const examplesDir = $.path(
      await newTempDir({
        dir: undefined,
      }),
    );
    t.addCleanup(async () => {
      await $.co([
        $.removeIfExists(typegateTempDir),
        $.removeIfExists(repoDir),
        // $.removeIfExists(examplesDir),
      ]);
    });

    const port = String(t.port + 1);

    const proc = new Deno.Command("meta-old", {
      args: ["typegate"],
      env: {
        ...Deno.env.toObject(),
        LOG_LEVEL: "DEBUG",
        PATH: `${metaBinDir}:${Deno.env.get("PATH")}`,
        TG_SECRET: tgSecret,
        TG_ADMIN_PASSWORD: "password",
        TMP_DIR: typegateTempDir,
        TG_PORT: port,
        // TODO should not be necessary
        VERSION: previousVersion,
        ...testConfig.syncEnvs,
      },
      stdout: "piped",
    }).spawn();

    await t.should(
      "download example typegraphs for the published version",
      async () => {
        const tag = `v${previousVersion}`;

        // FIXME: cache across test runs
        await $`git clone https://github.com/metatypedev/metatype.git --depth 1 --branch ${tag}`
          .cwd(repoDir)
          .stdout("piped")
          .stderr("piped")
          .printCommand();

        await $.path(repoDir).join("metatype/examples").copy(examplesDir, {
          overwrite: true,
        });
        const typegraphsDir = examplesDir.join("typegraphs");
        for await (const entry of typegraphsDir.readDir()) {
          const path = typegraphsDir.relative(entry.path);
          if (disabled.includes(path.toString())) {
            await entry.path.remove().catch((_e) => {});
          }
        }

        // NOTE: we clean out the deno.json used by the examples
        // before adding the published version
        // by default @typegraph/sdk/ needs that trailing slash
        // due to https://github.com/WICG/import-maps?tab=readme-ov-file#packages-via-trailing-slashes
        await examplesDir.join("deno.json").writeJson({});
        await $.raw`bash -c 'deno add @typegraph/sdk@${previousVersion}'`
          .cwd(examplesDir)
          .stdout("inherit")
          .printCommand();
      },
    );

    const typegraphs: string[] = [];

    const stdout = new Lines(proc.stdout);
    await stdout.readWhile((line) => {
      console.log(`typegate>`, line);
      return !line.includes(`typegate ready on ${port}`);
    });
    stdout.readWhile((line) => {
      const match = line.match(/Initializing engine '(.+)'/);
      if (match) {
        typegraphs.push(match[1]);
      }
      console.log("typegate counting matches>", line);
      return true;
    }, null);

    await t.should("successfully deploy on the published version", async () => {
      const command =
        `meta-old deploy --target dev --threads=4 --allow-dirty --gate http://localhost:${port} -vvv`;
      const res = await $`bash -c ${command}`
        .cwd(examplesDir.join("typegraphs"))
        .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`);
      console.log(res);
    });

    await stdout.close();
    proc.kill("SIGKILL");
    const status = await proc.status;
    console.log({ status });

    const typegraphs2: string[] = [];

    await t.should("upgrade the typegate to the current version", async () => {
      const port = String(t.port + 2);
      const proc = new Deno.Command("meta-full", {
        args: [
          "typegate",
          `--main-url`,
          import.meta.resolve("../../../src/typegate/src/main.ts"),
          `--import-map-url`,
          import.meta.resolve("../../../import_map.json"),
        ],
        env: {
          ...Deno.env.toObject(),
          TG_SECRET: tgSecret,
          TG_ADMIN_PASSWORD: "password",
          TMP_DIR: typegateTempDir,
          TG_PORT: `${port}`,
          // TODO should not be necessary
          VERSION: previousVersion,
          ...testConfig.syncEnvs,
        },
        stdout: "piped",
      }).spawn();

      const stdout = new Lines(proc.stdout);

      await stdout.readWhile((line) => {
        console.log("typegate>", line);
        const match = $.stripAnsi(line).match(/reloaded addition: (.+)/);
        if (match) {
          typegraphs2.push(match[1]);
        }
        return !line.includes(`typegate ready on :${port}`);
      });

      await stdout.close();
      proc.kill("SIGKILL");
      const status = await proc.status;
      console.log({ status });
    });

    console.log({ typegraphs: typegraphs.sort() });

    await t.should("have the same typegraphs", () => {
      assertEquals(typegraphs.sort(), typegraphs2.sort());
    });

    await Deno.remove(typegateTempDir, { recursive: true });
  },
);
