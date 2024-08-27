// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { projectDir } from "@local/tools/utils.ts";
import { $ } from "@local/tools/deps.ts";
import { PUBLISHED_VERSION, PYTHON_VERSION } from "@local/tools/consts.ts";
import { download } from "download";
import { Untar } from "@std/archive";
import { copy } from "@std/io/copy";
import { readerFromStreamReader } from "@std/io";
import { encodeBase64 } from "@std/encoding/base64";
import { Lines } from "test-utils/process.ts";
import { newTempDir } from "test-utils/dir.ts";
import { transformSyncConfig } from "@metatype/typegate/config.ts";
import { clearSyncData, setupSync } from "test-utils/hooks.ts";
import { assertEquals } from "@std/assert";

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
    const res = await $`bash -c 'meta-old --version'`
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
export async function downloadAndExtractCli(version: string) {
  const name = getAssetName(version);
  const extractTargetDir = tempDir.join(name);
  const metaBin = extractTargetDir.join("meta-old");
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
  const reader = file.readable.pipeThrough(new DecompressionStream("gzip"));
  const untar = new Untar(readerFromStreamReader(reader.getReader()));

  await extractTargetDir.ensureDir();

  for await (const entry of untar) {
    if (entry.fileName !== "meta") {
      throw new Error("unexpected");
    }
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

// This also tests the published NPM version of the SDK
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
        $.removeIfExists(examplesDir),
      ]);
    });

    const port = String(t.port + 1);

    const proc = new Deno.Command("meta-old", {
      args: ["typegate"],
      env: {
        ...Deno.env.toObject(),
        PATH: `${metaBinDir}:${Deno.env.get("PATH")}`,
        TG_SECRET: tgSecret,
        TG_ADMIN_PASSWORD: "password",
        TMP_DIR: typegateTempDir,
        TG_PORT: port,
        // TODO should not be necessary
        VERSION: previousVersion,
        ...syncEnvs,
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
          `--deno-config-url`,
          import.meta.resolve("../../../src/typegate/deno.jsonc"),
        ],
        env: {
          ...Deno.env.toObject(),
          TG_SECRET: tgSecret,
          TG_ADMIN_PASSWORD: "password",
          TMP_DIR: typegateTempDir,
          TG_PORT: `${port}`,
          // TODO should not be necessary
          VERSION: previousVersion,
          ...syncEnvs,
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
        return !line.includes(`typegate ready on ${port}`);
      });

      await stdout.close();
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

Meta.test(
  {
    name: "published SDK tests",
    async setup() {
      await clearSyncData(syncConfig);
      await setupSync(syncConfig);
    },
    async teardown() {
      await clearSyncData(syncConfig);
    },
  },
  async (t) => {
    let publishedBin = "";
    await t.should("download published cli (fat version)", async () => {
      publishedBin = await downloadAndExtractCli(previousVersion);
    });

    const metaBinDir = $.path(publishedBin).parent()!.toString();

    const tmpDir = $.path(t.tempDir);
    const tgSecret = encodeBase64(
      globalThis.crypto.getRandomValues(new Uint8Array(64)),
    );

    const typegateTempDir = await tmpDir.join(".metatype").ensureDir();

    const port = String(t.port - 10);

    const proc = $`bash -c 'meta-old typegate -vvvv'`
      .env({
        PATH: `${metaBinDir}:${Deno.env.get("PATH")}`,
        TG_SECRET: tgSecret,
        TG_ADMIN_PASSWORD: "password",
        TMP_DIR: typegateTempDir.toString(),
        TG_PORT: `${port}`,
        // TODO should not be necessary
        VERSION: previousVersion,
        DEBUG: "true",
        ...syncEnvs,
      })
      .stdout("piped")
      .noThrow()
      .spawn();

    const stdout = new Lines(proc.stdout());
    console.log("waiting on typegate to be ready");

    await stdout.readWhile((line) => {
      console.error("typegate>", line);
      return !line.includes(`typegate ready on ${port}`);
    });

    const tgsDir = $.path(
      await newTempDir({
        dir: undefined,
      }),
    );
    // t.addCleanup(() => $.removeIfExists(tgsDir));

    await tgsDir.join("metatype.yml").writeText(`
typegates:
  dev:
    url: "http://localhost:${port}"
    username: admin
    password: password
    secrets:
      roadmap-func:
        POSTGRES: "postgresql://postgres:password@localhost:5432/db?schema=roadmap_func2"
        BASIC_andim: hunter2

typegraphs:
  materializers:
    prisma:
      migrations_path: "migrations"
`);
    await t.should("work with JSR npm", async () => {
      const npmJsrDir = await tgsDir.join("npm_jsr").ensureDir();
      await $`pnpm init`.cwd(npmJsrDir);
      await $`pnpm --package=jsr dlx jsr add @typegraph/sdk@${PUBLISHED_VERSION}`
        .cwd(
          npmJsrDir,
        );
      await $.co([
        $.path("examples/typegraphs/func.ts").copy(npmJsrDir.join("tg.ts")),
        $.path("examples/typegraphs/scripts").copyToDir(npmJsrDir),
        $.path("examples/templates/node/tsconfig.json").copyToDir(npmJsrDir),
        npmJsrDir
          .join("package.json")
          .readJson()
          .then((pkg) =>
            npmJsrDir
              .join("package.json")
              .writeJson({ ...(pkg as object), type: "module" })
          ),
      ]);

      const command =
        `meta-old deploy --target dev --allow-dirty --gate http://localhost:${port} -vvv -f tg.ts`;
      await $`bash -c ${command}`
        .cwd(npmJsrDir)
        .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
        .env("MCLI_LOADER_CMD", "pnpm --package=tsx dlx tsx")
        .env("RUST_LOG", "trace");
    });

    await t.should("work with JSR deno", async () => {
      const denoJsrDir = await tgsDir.join("deno_jsr").ensureDir();
      await denoJsrDir.join("deno.json").writeJson({});
      await $`bash -c 'deno add @typegraph/sdk@${PUBLISHED_VERSION}'`.cwd(
        denoJsrDir,
      );
      await $.co([
        $.path("examples/typegraphs/func.ts").copy(denoJsrDir.join("tg.ts")),
        $.path("examples/typegraphs/scripts").copyToDir(denoJsrDir),
      ]);

      const command =
        `meta-old deploy --target dev --allow-dirty --gate http://localhost:${port} -vvv -f tg.ts`;
      await $`bash -c ${command}`
        .cwd(denoJsrDir)
        .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
        .env("MCLI_LOADER_CMD", `deno run -A --config deno.json`)
        .env("RUST_LOG", "trace");
    });

    await t.should("work with pypa", async () => {
      const pypaDir = await tgsDir.join("pypa").ensureDir();
      await $
        .raw`poetry init -n --python=${PYTHON_VERSION} --dependency=typegraph:${PUBLISHED_VERSION}`
        .cwd(
          pypaDir,
        );
      await $.co([
        pypaDir.join("README.md").ensureFile(),
        $`bash -c 'python3 -m venv .venv && source .venv/bin/activate && poetry install --no-root'`
          .cwd(
            pypaDir,
          ),
        $.path("examples/typegraphs/func.py").copy(pypaDir.join("tg.py")),
        $.path("examples/typegraphs/scripts").copyToDir(pypaDir),
      ]);

      const command = `source .venv/bin/activate &&` +
        ` meta-old deploy --target dev --allow-dirty --gate http://localhost:${port} -vvv -f tg.py`;
      await $`bash -c ${command}`
        .cwd(pypaDir)
        .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
        .env("MCLI_LOADER_PY", `poetry run python`)
        .env("RUST_LOG", "trace");
    });

    proc.kill("SIGKILL");
    const status = await proc;
    console.log({ status });
    await stdout.close();
  },
);
