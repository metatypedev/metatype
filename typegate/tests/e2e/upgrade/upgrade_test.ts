// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { projectDir } from "@dev/utils.ts";
import { $ } from "@dev/deps.ts";
import { download } from "download";
import { Untar } from "std/archive/untar.ts";
import { readerFromIterable } from "std/streams/mod.ts";
import { copy } from "std/io/copy.ts";
import { encodeBase64 } from "std/encoding/base64.ts";
import { Lines } from "test-utils/process.ts";
import { newTempDir } from "test-utils/dir.ts";
import { transformSyncConfig } from "@typegate/config.ts";
import { clearSyncData, setupSync } from "test-utils/hooks.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

const PUBLISHED_VERSION = "0.4.3";

const previousVersion = PUBLISHED_VERSION;

const tempDir = $.path(projectDir).join("tmp");

function getAssetName(version: string) {
  return `meta-cli-v${version}-${Deno.build.target}`;
}

const syncEnvs = {
  SYNC_REDIS_URL: "redis://:password@localhost:6379/12",
  SYNC_S3_HOST: "http://localhost:9000",
  SYNC_S3_REGION: "local",
  SYNC_S3_ACCESS_KEY: "minio",
  SYNC_S3_SECRET_KEY: "password",
  SYNC_S3_BUCKET: "upgrade-test",
  SYNC_S3_PATH_STYLE: "true",
};

const syncConfig = transformSyncConfig({
  redis_url: new URL(syncEnvs.SYNC_REDIS_URL),
  s3_host: new URL(syncEnvs.SYNC_S3_HOST),
  s3_region: syncEnvs.SYNC_S3_REGION,
  s3_access_key: syncEnvs.SYNC_S3_ACCESS_KEY,
  s3_secret_key: syncEnvs.SYNC_S3_SECRET_KEY,
  s3_bucket: syncEnvs.SYNC_S3_BUCKET,
  s3_path_style: true,
});
console.log(syncConfig);

// TODO remove after the next release
// These typegates are disabled because a compatibity issue on the pyrt wasm:
//  Module was  WebAssembly backtrace support but it is enabled for the host
const disabled = [
  "quick-start-project.ts",
  "faas-runner.ts",
  "microservice-orchestration.ts",
  "metagen-rs.ts",
  "metagen-py.ts",
];

async function checkMetaBin(path: typeof tempDir, version: string) {
  try {
    if (!(await path.exists())) {
      return false;
    }
    const res = await $`bash -c 'meta --version'`
      .env("PATH", `${path.parent()!.toString()}:${Deno.env.get("PATH")}`)
      .stdout("piped");
    if (res.stdout.includes(version)) {
      return true;
    }
    throw new Error(`version mismatch: ${res.stdout}`);
  } catch (e) {
    console.error(e);
    return false;
  }
}

// download the fat version of the cli on the latest stable release
async function downloadAndExtractAsset(version: string) {
  const name = getAssetName(version);
  const extractTargetDir = tempDir.join(name);
  const metaBin = extractTargetDir.join("meta");
  if (await checkMetaBin(metaBin, version)) {
    return metaBin.toString();
  }
  const url =
    `https://github.com/metatypedev/metatype/releases/download/v${version}/${name}.tar.gz`;
  console.log("Downloading from", url);
  const archiveName = `${name}.tar.gz`;
  const _fileObj = await download(url, {
    file: archiveName,
    dir: tempDir.toString(),
  });
  const archivePath = tempDir.join(archiveName);
  using file = await Deno.open(archivePath.toString());
  const reader = readerFromIterable(
    file.readable.pipeThrough(new DecompressionStream("gzip")),
  );
  const untar = new Untar(reader);

  for await (const entry of untar) {
    if (entry.fileName !== "meta") {
      throw new Error("unexpected");
    }
    Deno.mkdir(extractTargetDir.toString(), { recursive: true });
    using target = await Deno.open(metaBin.toString(), {
      create: true,
      write: true,
      mode: 0o755,
    });
    const res = await copy(entry, target);
    console.log(`successfully written ${res} bytes`);
  }

  await Deno.remove(archivePath.toString());

  if (!(await checkMetaBin(metaBin, version))) {
    throw new Error("unexpected");
  }
  return metaBin.toString();
}

Meta.test(
  {
    name: "typegate upgrade",
    async setup() {
      await clearSyncData(syncConfig);
      await setupSync(syncConfig);
    },
    async teardown() {
      await clearSyncData(syncConfig);
    },
  },
  async (t) => {
    let publishedBin: string = "";
    await t.should("download published cli (fat version)", async () => {
      publishedBin = await downloadAndExtractAsset(previousVersion);
    });

    const metaBinDir = $.path(publishedBin).parent()!.toString();
    const tgSecret = encodeBase64(
      globalThis.crypto.getRandomValues(new Uint8Array(64)),
    );

    const typegateTempDir = await newTempDir();
    const repoDir = await newTempDir();

    const proc = new Deno.Command("meta", {
      args: ["typegate"],
      env: {
        ...Deno.env.toObject(),
        PATH: `${metaBinDir}:${Deno.env.get("PATH")}`,
        TG_SECRET: tgSecret,
        TG_ADMIN_PASSWORD: "password",
        TMP_DIR: typegateTempDir,
        TG_PORT: "7899",
        // TODO should not be necessary
        VERSION: previousVersion,
        ...syncEnvs,
      },
      stdout: "piped",
      // stderr: "piped",
    }).spawn();

    const examplesDir = $.path(repoDir).join("metatype/examples");

    await t.should(
      "download example typegraphs for the published version",
      async () => {
        const tag = `v${previousVersion}`;

        await $`git clone https://github.com/metatypedev/metatype.git --depth 1 --branch ${tag} --quiet`
          .cwd(repoDir)
          .stdout("piped")
          .stderr("piped")
          .printCommand();

        const typegraphsDir = examplesDir.join("typegraphs");
        for await (const entry of typegraphsDir.readDir()) {
          const path = typegraphsDir.relative(entry.path);
          if (disabled.includes(path.toString())) {
            await entry.path.remove().catch((_e) => {});
          }
        }

        await $`pnpm install`
          .cwd(examplesDir.join("typegraphs"))
          .stdout("inherit")
          .printCommand();

        await $.raw`pnpm add @typegraph/sdk@${previousVersion}`
          .cwd(examplesDir.join("typegraphs"))
          .env("NPM_CONFIG_REGISTRY", "https://registry.npmjs.org")
          .stdout("inherit")
          .printCommand();
      },
    );

    const typegraphs: string[] = [];

    const stdout = new Lines(proc.stdout);
    await stdout.readWhile((line) => {
      // console.log("typegate>", line);
      return !line.includes("typegate ready on 7899");
    });
    stdout.readWhile((line) => {
      const match = line.match(/Initializing engine '(.+)'/);
      if (match) {
        typegraphs.push(match[1]);
      }
      console.log("typegate>", line);
      return true;
    });

    await t.should("successfully deploy on the published version", async () => {
      const command =
        `meta deploy --target dev --max-parallel-loads=4 --allow-dirty --gate http://localhost:7899 -vvv`;
      const res = await $`bash -c ${command}`
        .cwd(examplesDir.join("typegraphs"))
        .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
        .env("MCLI_LOADER_CMD", "npm x tsx");
      console.log(res);
    });

    await stdout.close();
    proc.kill("SIGKILL");
    const status = await proc.status;
    console.log({ status });

    const typegraphs2: string[] = [];

    await t.should("upgrade the typegate to the current version", async () => {
      const proc = new Deno.Command("meta-full", {
        args: ["typegate"],
        env: {
          ...Deno.env.toObject(),
          TG_SECRET: tgSecret,
          TG_ADMIN_PASSWORD: "password",
          TMP_DIR: typegateTempDir,
          TG_PORT: "7899",
          // TODO should not be necessary
          VERSION: previousVersion,
          ...syncEnvs,
        },
        stdout: "piped",
        stderr: "piped",
      }).spawn();

      const stdout = new Lines(proc.stdout);
      const stderr = new Lines(proc.stderr);

      stderr.readWhile((line) => {
        console.log("typegate[E]>", line);
        return true;
      });

      await stdout.readWhile((line) => {
        console.log("typegate>", line);
        const match = $.stripAnsi(line).match(/reloaded addition: (.+)/);
        if (match) {
          typegraphs2.push(match[1]);
        }
        return !line.includes("typegate ready on 7899");
      });

      await stdout.close();
      await stderr.close();
      proc.kill("SIGKILL");
      const status = await proc.status;
      console.log({ status });
    });

    await t.should("have the same typegraphs", () => {
      assertEquals(typegraphs.sort(), typegraphs2.sort());
    });

    await Deno.remove(typegateTempDir, { recursive: true });
  },
);
