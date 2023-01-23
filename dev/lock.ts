// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as yaml from "https://deno.land/std@0.170.0/encoding/yaml.ts";
import { expandGlobSync } from "https://deno.land/std@0.170.0/fs/expand_glob.ts";
import * as flags from "https://deno.land/std@0.170.0/flags/mod.ts";
import * as semver from "https://deno.land/x/semver/mod.ts";

interface Lockfile {
  [channel: string]: {
    rules: Record<string, Record<string, string>>;
    lock: Record<string, string>;
  };
}

const args = flags.parse(Deno.args, {
  boolean: ["version", "check"],
  string: ["bump"],
  default: { version: false, check: false },
});

const lockfileUrl = new URL("lock.yml", import.meta.url);
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
  lockfile.released.lock = lockfile.dev.lock;
  lockfile.dev.lock.METATYPE_VERSION = newVersion;
  console.log(`Bumping ${version} → ${newVersion}`);
}
Deno.writeTextFileSync(lockfileUrl, yaml.stringify(lockfile));

let dirty = false;

for (const [channel, { rules, lock }] of Object.entries(lockfile)) {
  console.log(`Updating channel ${channel}:`);
  for (const [glob, lookups] of Object.entries(rules)) {
    const url = new URL(`../${glob}`, import.meta.url);

    for (const { path } of expandGlobSync(url, { includeDirs: false })) {
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
        console.log(`- Updated ${path}`);
        Deno.writeTextFileSync(path, newText);
        dirty = true;
      } else {
        console.log(`- No change ${path}`);
      }
    }
  }
}

if (args.check) {
  Deno.exit(dirty ? 1 : 0);
}
