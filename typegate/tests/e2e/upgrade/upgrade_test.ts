import { Meta } from "test-utils/mod.ts";
import { METATYPE_VERSION, PUBLISHED_VERSION } from "@dev/consts.ts";
import { projectDir } from "@dev/utils.ts";
import { $ } from "@dev/deps.ts";
import { download } from "download";
import { Untar } from "std/archive/untar.ts";
import { readerFromIterable } from "std/streams/mod.ts";
import { copy } from "std/io/copy.ts";
import { encodeBase64 } from "std/encoding/base64.ts";
import { ProcessOutputLines } from "test-utils/process.ts";
import { newTempDir } from "test-utils/dir.ts";

const previousVersion = PUBLISHED_VERSION;

const tempDir = $.path(projectDir).join("tmp");

function getAssetName(version: string) {
  return `meta-cli-v${version}-${Deno.build.target}`;
}

const disabled = [
  "quick-start-project.ts",
  "faas-runner.ts",
  "microservice-orchestration.ts",
  "metagen-rs.ts",
  "metagen-py.ts",
];

async function checkMetaBin(path: typeof tempDir) {
  try {
    if (!(await path.exists())) {
      return false;
    }
    const res = await $`bash -c 'meta --version'`
      .env("PATH", `${path.parent()!.toString()}:${Deno.env.get("PATH")}`)
      .stdout("piped");
    console.log(res.stdout);
    return true;
  } catch (e) {
    return false;
  }
}

// download the fat version of the cli on the latest stable release
async function downloadAndExtractAsset(version: string) {
  const name = getAssetName(version);
  const extractTargetDir = tempDir.join(name);
  const metaBin = extractTargetDir.join("meta");
  if (await checkMetaBin(metaBin)) {
    return metaBin.toString();
  }
  const url = `https://github.com/metatypedev/metatype/releases/download/v${version}/${name}.tar.gz`;
  console.log("Downloading from", url);
  const archiveName = `${name}.tar.gz`;
  const fileObj = await download(url, {
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
    console.log(`successfully write ${res} bytes`);
  }

  await Deno.remove(archivePath.toString());

  if (!(await checkMetaBin(metaBin))) {
    throw new Error("unexpected");
  }
  return metaBin.toString();
}

Meta.test("typegate upgrade", async (t) => {
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

  console.log({ metaBinDir, path: Deno.env.get("PATH") });
  let envPathList = Deno.env.get("PATH")!.split(":");
  envPathList = envPathList.filter((path) => !path.includes("target/debug"));
  envPathList.unshift(metaBinDir);
  const envPath = envPathList.join(":");
  console.log(envPath);

  const proc = new Deno.Command("meta", {
    args: ["typegate"],
    env: {
      ...Deno.env.toObject(),
      PATH: `${metaBinDir}:${Deno.env.get("PATH")}`,
      TG_SECRET: tgSecret,
      TG_ADMIN_PASSWORD: "password",
      TMP_DIR: typegateTempDir,
      TG_PORT: "7899",
    },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
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
        if (path !== "basic.ts" && !path.endsWith(".json")) {
          await entry.path.remove().catch((e) => {});
        }
        // if (disabled.includes(path.toString())) {
        //   await entry.path.remove().catch((e) => {});
        // }
      }

      // temp
      for await (const entry of typegraphsDir.readDir()) {
        const path = typegraphsDir.relative(entry.path);
        console.log(path);
        // if (disabled.includes(path.toString())) {
        //   throw new Error("unexpected");
        // }
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

  const processLines = new ProcessOutputLines(proc);
  await processLines.fetchStdoutLines((line) => {
    console.log("typegate>", line);
    return !line.includes("typegate ready on 7899");
  });
  processLines.fetchStdoutLines((line) => {
    console.log("typegate>", line);
    return true;
  });

  await t.should(
    "successfully deploy with the current published version",
    async () => {
      const command = `meta deploy --target dev --max-parallel-loads=4 --allow-dirty --gate http://localhost:7899 -vvv`;
      const res = await $`bash -c ${command}`
        .cwd(examplesDir.join("typegraphs"))
        .env("PATH", `${metaBinDir}:${Deno.env.get("PATH")}`)
        .env("MCLI_LOADER_CMD", "npm x tsx");
      console.log(res);
    },
  );

  const status = await processLines.close();
  console.log(status);

  //

  await Deno.remove(typegateTempDir, { recursive: true });
});
