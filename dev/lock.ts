#!/bin/env -S ghjk deno run -A

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { $, expandGlob, parseArgs, semver, yaml, zod } from "./deps.ts";
import { projectDir, relPath } from "./utils.ts";

const lockfileValidator = zod.record(
  zod.string(),
  zod.object({
    files: zod.record(zod.string(), zod.string().array()),
    lines: zod.record(zod.string(), zod.record(zod.string(), zod.string())),
    lock: zod.record(zod.string(), zod.string()),
  }),
);
const lockfilePath = $.path(import.meta.dirname!);
let lockfileCell: Promise<zod.infer<typeof lockfileValidator>> | undefined;
export function getLockfile() {
  if (!lockfileCell) {
    lockfileCell = lockfilePath.join("lock.yml").readText()
      .then(yaml.parse)
      .then(lockfileValidator.parse);
  }
  return lockfileCell;
}

/**
 * This will call {@link grepLock}
 */
export async function bumpVersion(bump: string) {
  const bumps = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease",
  ];
  const lockfile = await getLockfile();

  if (!bumps.includes(bump)) {
    throw new Error(
      `invalid version bump "${bump}", valid are: ${bumps.join(", ")}`,
    );
  }

  const version = lockfile.dev.lock.METATYPE_VERSION;
  const newVersion = semver.format(
    semver.increment(semver.parse(version), bump as semver.ReleaseType),
  );
  lockfile.dev.lock.METATYPE_VERSION = newVersion;
  $.logStep(`Bumping ${version} → ${newVersion}`);

  await lockfilePath.writeText(yaml.stringify(lockfile));
}

export async function grepLock() {
  const wd = $.path(projectDir);

  const ignores = (await wd.resolve(".gitignore").readText())
    .split("\n")
    .map((l) => l.trim())
    .filter((line) => line.length > 0)
    .map((l) => `${l}${l.endsWith("*") ? "" : "*"}`);

  const lockfile = await getLockfile();

  let dirty = false;

  for (const [channel, { files, lines, lock }] of Object.entries(lockfile)) {
    $.logStep(`Updating channel ${channel}:`);
    await $.logGroup(async () => {
      await $.co(
        Object
          .entries(lines)
          .map(async ([glob, lookups]) => {
            const paths = await Array.fromAsync(
              expandGlob(glob, {
                root: wd.toString(),
                includeDirs: false,
                globstar: true,
                exclude: ignores,
              }),
            );

            // FIXME: terrible hack
            // replace globs with regexps
            if (glob.match(/Cargo/)) {
              const idx = paths.findIndex((ent) =>
                ent.path.match(/node_modules/)
              );
              if (idx != -1) {
                $.logWarn("special excluded path", paths[idx].path);
                paths[idx] = paths.pop()!;
              }
            }

            if (paths.length == 0) {
              throw new Error(
                `No files found for ${glob}, please check and retry.`,
              );
            }

            const matches = Object.fromEntries(
              Object.keys(lookups).map((k) => [k, 0]),
            );

            await $.co(
              paths.map(async ({ path: pathStr }) => {
                const path = $.path(pathStr);
                const text = await path.readText();
                const rewrite = [...text.split("\n")];

                for (const [pattern, replacement] of Object.entries(lookups)) {
                  const regex = new RegExp(`^${pattern}$`);

                  for (let i = 0; i < rewrite.length; i += 1) {
                    if (regex.test(rewrite[i])) {
                      matches[pattern] += 1;
                    }

                    rewrite[i] = rewrite[i].replace(
                      regex,
                      `$1${lock[replacement]}$2`,
                    );
                  }
                }

                const newText = rewrite.join("\n");
                if (text != newText) {
                  await path.writeText(newText);
                  $.logStep(`Updated ${relPath(pathStr)}`);
                  dirty = true;
                } else {
                  // $.logLight(`No change ${relPath(pathStr)}`);
                }
              }),
            );

            for (const [pattern, count] of Object.entries(matches)) {
              if (count == 0) {
                throw new Error(
                  `No matches found for ${pattern} in ${glob}, please check and retry.`,
                );
              }
            }
          }),
      );

      await $.co(
        Object.entries(files)
          .map(async ([file, copies]) => {
            const url = wd.resolve(file);
            const text = await url.readText();

            for (const copy of copies) {
              const copyUrl = wd.resolve(copy);
              const copyText = await copyUrl.readText();

              if (copyText != text) {
                copyUrl.writeText(text);
                $.logStep(`Updated ${relPath(copyUrl.toString())}`);
                dirty = true;
              } else {
                $.logLight(`No change ${relPath(copyUrl.toString())}`);
              }
            }
          }),
      );
    })
  }

  if (dirty) {
    await $`cargo generate-lockfile --offline`.cwd(wd).printCommand();
  }

  return dirty;
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    boolean: ["version", "check"],
    string: ["bump"],
    default: { version: false, check: false },
  });

  const lockfile = await getLockfile();

  const version = lockfile.dev.lock.METATYPE_VERSION;

  if (args.version) {
    console.log(version);
    Deno.exit();
  }

  const dirty = await grepLock();

  if (args.check) {
    Deno.exit(dirty ? 1 : 0);
  }
}
