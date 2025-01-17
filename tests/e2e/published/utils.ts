// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { $ } from "@local/tools/deps.ts";
import { projectDir } from "@local/tools/utils.ts";

import { download } from "download";
import { Untar } from "@std/archive/untar";
import { copy } from "@std/io/copy";
import { encodeBase64 } from "@std/encoding/base64";
import { readerFromStreamReader } from "@std/io/reader-from-stream-reader";

const tempDir = $.path(projectDir).join("tmp");

function getAssetName(version: string) {
  return `meta-cli-v${version}-${Deno.build.target}`;
}

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
