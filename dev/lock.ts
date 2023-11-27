// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlobSync, parseFlags, resolve, semver, yaml } from "./deps.ts";
import {
  getLockfile,
  lockfileUrl,
  projectDir,
  relPath,
  runOrExit,
} from "./utils.ts";

const args = parseFlags(Deno.args, {
  boolean: ["version", "check"],
  string: ["bump"],
  default: { version: false, check: false },
});

const ignores = Deno.readTextFileSync(resolve(projectDir, ".gitignore"))
  .split("\n")
  .map((l) => l.trim())
  .filter((line) => line.length > 0);

const lockfile = await getLockfile();

const version = lockfile.dev.lock.METATYPE_VERSION;
if (args.version) {
  console.log(version);
  Deno.exit();
}

const bumps = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease",
];
if (args.bump) {
  if (!bumps.includes(args.bump)) {
    console.log(`Invalid bump "${args.bump}", valid are: ${bumps.join(", ")}`);
    Deno.exit(1);
  }

  const newVersion = semver.format(
    semver.increment(semver.parse(version), args.bump as semver.ReleaseType),
  );
  lockfile.dev.lock.METATYPE_VERSION = newVersion;
  console.log(`Bumping ${version} → ${newVersion}`);
}
Deno.writeTextFileSync(lockfileUrl, yaml.stringify(lockfile));

let dirty = false;

for (const [channel, { files, lines, lock }] of Object.entries(lockfile)) {
  console.log(`Updating channel ${channel}:`);

  for (const [glob, lookups] of Object.entries(lines)) {
    const url = resolve(projectDir, glob);
    const paths = Array.from(
      expandGlobSync(url, {
        includeDirs: false,
        globstar: true,
        exclude: ignores,
      }),
    );

    if (paths.length == 0) {
      console.error(`No files found for ${glob}, please check and retry.`);
      Deno.exit(1);
    }

    const matches = Object.fromEntries(Object.keys(lookups).map((k) => [k, 0]));

    for (const { path } of paths) {
      const text = Deno.readTextFileSync(path);
      const rewrite = [...text.split("\n")];

      for (const [pattern, replacement] of Object.entries(lookups)) {
        const regex = new RegExp(`^${pattern}$`);

        for (let i = 0; i < rewrite.length; i += 1) {
          if (regex.test(rewrite[i])) {
            matches[pattern] += 1;
          }

          rewrite[i] = rewrite[i].replace(regex, `$1${lock[replacement]}$2`);
        }
      }

      const newText = rewrite.join("\n");
      if (text != newText) {
        console.log(`- Updated ${relPath(path)}`);
        Deno.writeTextFileSync(path, newText);
        dirty = true;
      } else {
        console.log(`- No change ${relPath(path)}`);
      }
    }

    for (const [pattern, count] of Object.entries(matches)) {
      if (count == 0) {
        console.error(
          `No matches found for ${pattern} in ${glob}, please check and retry.`,
        );
        Deno.exit(1);
      }
    }
  }

  for (const [file, copies] of Object.entries(files)) {
    const url = resolve(projectDir, file);
    const text = Deno.readTextFileSync(url);

    for (const copy of copies) {
      const copyUrl = resolve(projectDir, copy);
      const copyText = Deno.readTextFileSync(copyUrl);

      if (copyText != text) {
        console.log(`- Updated ${relPath(copyUrl)}`);
        Deno.writeTextFileSync(copyUrl, text);
        dirty = true;
      } else {
        console.log(`- No change ${relPath(copyUrl)}`);
      }
    }
  }
}

if (dirty) {
  await runOrExit(["cargo", "generate-lockfile"]);
}

if (args.check) {
  Deno.exit(dirty ? 1 : 0);
}
