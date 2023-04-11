// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  expandGlobSync,
  parseFlags,
  projectDir,
  relPath,
  resolve,
  semver,
  yaml,
} from "./mod.ts";

interface Lockfile {
  [channel: string]: {
    files: Record<string, string[]>;
    rules: Record<string, Record<string, string>>;
    lock: Record<string, string>;
  };
}

const args = parseFlags(Deno.args, {
  boolean: ["version", "check"],
  string: ["bump"],
  default: { version: false, check: false },
});

const ignores = Deno.readTextFileSync(resolve(projectDir, ".gitignore")).split(
  "\n",
).map((l) => l.trim()).filter((line) => line.length > 0);

const lockfileUrl = resolve(projectDir, "dev/lock.yml");
const lockfile = yaml.parse(
  Deno.readTextFileSync(lockfileUrl),
) as Lockfile;

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

  const newVersion = semver.inc(
    version,
    args.bump as semver.ReleaseType,
    undefined,
    "dev",
  )!;
  lockfile.released.lock = structuredClone(lockfile.dev.lock);
  lockfile.dev.lock.METATYPE_VERSION = newVersion;
  console.log(`Bumping ${version} → ${newVersion}`);
}
Deno.writeTextFileSync(lockfileUrl, yaml.stringify(lockfile));

let dirty = false;

for (const [channel, { files, rules, lock }] of Object.entries(lockfile)) {
  console.log(`Updating channel ${channel}:`);

  for (const [glob, lookups] of Object.entries(rules)) {
    const url = resolve(projectDir, glob);

    for (
      const { path } of expandGlobSync(url, {
        includeDirs: false,
        globstar: true,
        exclude: ignores,
      })
    ) {
      const text = Deno.readTextFileSync(path);
      const rewrite = [...text.split("\n")];

      for (const [pattern, replacement] of Object.entries(lookups)) {
        const regex = new RegExp(`^${pattern}$`);
        for (let i = 0; i < rewrite.length; i += 1) {
          rewrite[i] = rewrite[i].replace(
            regex,
            `$1${lock[replacement]}$2`,
          );
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

if (args.check) {
  Deno.exit(dirty ? 1 : 0);
}
