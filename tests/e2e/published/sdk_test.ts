// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { $ } from "@local/tools/deps.ts";
import { PUBLISHED_VERSION, PYTHON_VERSION } from "@local/tools/consts.ts";
import { encodeBase64 } from "@std/encoding/base64";
import { Lines } from "test-utils/process.ts";
import { newTempDir } from "test-utils/dir.ts";
import { downloadAndExtractCli } from "./utils.ts";
import { Config } from "./config.ts";

const testConfig = new Config(12, "published-sdk-test");

// const previousVersion = PUBLISHED_VERSION;
const previousVersion = "0.4.10";

Meta.test.only(
  {
    name: "published SDK tests",
    async setup() {
      await testConfig.clearSyncData();
      await testConfig.setupSync();
    },
    async teardown() {
      await testConfig.clearSyncData();
    },
  },
  async (t) => {
    // const previousVersion = PUBLISHED_VERSION;
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
        ...testConfig.syncEnvs,
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

    // await t.should("work with JSR npm", async () => {
    //   const npmJsrDir = await tgsDir.join("npm_jsr").ensureDir();
    //   await $`pnpm init`.cwd(npmJsrDir);
    //   await $`pnpm --package=jsr dlx jsr add @typegraph/sdk@${previousVersion}`
    //     .cwd(
    //       npmJsrDir,
    //     );
    //   await $.co([
    //     $.path("examples/typegraphs/func.ts").copy(npmJsrDir.join("tg.ts")),
    //     $.path("examples/typegraphs/scripts").copyToDir(npmJsrDir),
    //     $.path("examples/templates/node/tsconfig.json").copyToDir(npmJsrDir),
    //     npmJsrDir
    //       .join("package.json")
    //       .readJson()
    //       .then((pkg) =>
    //         npmJsrDir
    //           .join("package.json")
    //           .writeJson({ ...(pkg as object), type: "module" })
    //       ),
    //   ]);
    //
    //   const command =
    //     `meta-old deploy --target dev --allow-dirty --gate http://localhost:${port} -vvv -f tg.ts`;
    //   await $`bash -c ${command}`
    //     .cwd(npmJsrDir)
    //     .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
    //     .env("MCLI_LOADER_CMD", "pnpm --package=tsx dlx tsx")
    //     .env("RUST_LOG", "trace");
    // });

    // await t.should("work with JSR deno", async () => {
    //   const denoJsrDir = await tgsDir.join("deno_jsr").ensureDir();
    //   await denoJsrDir.join("deno.json").writeJson({});
    //   await $`bash -c 'deno add @typegraph/sdk@${previousVersion}'`.cwd(
    //     denoJsrDir,
    //   );
    //   await $.co([
    //     $.path("examples/typegraphs/func.ts").copy(denoJsrDir.join("tg.ts")),
    //     $.path("examples/typegraphs/scripts").copyToDir(denoJsrDir),
    //   ]);
    //
    //   const command =
    //     `meta-old deploy --target dev --allow-dirty --gate http://localhost:${port} -vvv -f tg.ts`;
    //   await $`bash -c ${command}`
    //     .cwd(denoJsrDir)
    //     .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
    //     // FIXME: rename to deno.jsonc on bump 0.4.9
    //     .env("MCLI_LOADER_CMD", `deno run -A --config deno.json`)
    //     .env("RUST_LOG", "trace");
    // });
    //
    // await t.should("work with pypa", async () => {
    //   const pypaDir = await tgsDir.join("pypa").ensureDir();
    //   await $
    //     .raw`poetry init -n --python=${PYTHON_VERSION} --dependency=typegraph:${previousVersion}`
    //     .cwd(
    //       pypaDir,
    //     );
    //   await $.co([
    //     pypaDir.join("README.md").ensureFile(),
    //     $`bash -c 'python3 -m venv .venv && source .venv/bin/activate && poetry install --no-root'`
    //       .cwd(
    //         pypaDir,
    //       ),
    //     $.path("examples/typegraphs/func.py").copy(pypaDir.join("tg.py")),
    //     $.path("examples/typegraphs/scripts").copyToDir(pypaDir),
    //   ]);
    //
    //   const command = `source .venv/bin/activate &&` +
    //     ` ${metaBinDir}/meta-old deploy --target dev --allow-dirty --gate http://localhost:${port} -vvv -f tg.py`;
    //   await $`bash -c ${command}`
    //     .cwd(pypaDir)
    //     .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
    //     .env("MCLI_LOADER_PY", `poetry run python`)
    //     .env("RUST_LOG", "trace");
    // });

    proc.kill("SIGKILL");
    const status = await proc;
    console.log({ status });
    await stdout.close();
  },
);
