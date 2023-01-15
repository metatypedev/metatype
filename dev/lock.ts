import * as yaml from "https://deno.land/std@0.170.0/encoding/yaml.ts";
import { expandGlobSync } from "https://deno.land/std@0.170.0/fs/expand_glob.ts";
import * as flags from "https://deno.land/std@0.170.0/flags/mod.ts";
import * as semver from "https://deno.land/x/semver/mod.ts";

type Rules = Record<string, string>;

const rules: Record<string, Rules> = {
  "../rust-toolchain.toml": {
    '(channel = ").+(")': "RUST_VERSION",
  },
  "../.github/*/*.yml": {
    '(  PYTHON_VERSION: ").+(")': "PYTHON_VERSION",
    '(  POETRY_VERSION: ").+(")': "POETRY_VERSION",
    '(  RUST_VERSION: ").+(")': "RUST_VERSION",
    '(  DENO_BINDGEN_URL: ").+(")': "DENO_BINDGEN_URL",
    '(  DENO_VERSION: ").+(")': "DENO_VERSION",
    '(  PNPM_VERSION: ").+(")': "PNPM_VERSION",
    '(  NODE_VERSION: ").+(")': "NODE_VERSION",
  },
  "../typegraph/typegraph/__init__.py": {
    '(version = ").+(")': "METATYPE_VERSION",
  },
  "../**/*/pyproject.toml": {
    '(version = ").+(")': "METATYPE_VERSION",
  },
  "../**/*/Cargo.toml": {
    '(version = ").+(")': "METATYPE_VERSION",
  },
  "../dev/Dockerfile": {
    "(ARG DENO_VERSION=).*()": "DENO_VERSION",
    "(ARG DENO_BINDGEN_URL=).*()": "DENO_BINDGEN_URL",
    "(ARG RUST_VERSION=).*()": "RUST_VERSION",
  },
  "../typegate/src/typegraph.ts": {
    '(const typegraphVersion = ").*(";)': "TYPEGRAPH_VERSION",
  },
  "../typegraph/typegraph/graph/typegraph.py": {
    '(typegraph_version = ").*(")': "TYPEGRAPH_VERSION",
  },
  "../whiz.yaml": {
    '(  TYPEGRAPH_VERSION: ").+(")': "TYPEGRAPH_VERSION",
  },
};

const args = flags.parse(Deno.args, {
  boolean: ["version"],
  string: ["bump"],
  default: { version: false },
});

const lockfile = new URL("lock.yml", import.meta.url);
const lock = yaml.parse(
  Deno.readTextFileSync(lockfile),
) as Record<string, unknown>;
const version = lock.METATYPE_VERSION as string;

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
  );
  lock.METATYPE_VERSION = newVersion;
  console.log(`Bumping ${version} → ${newVersion}`);
  Deno.writeTextFileSync(lockfile, yaml.stringify(lock));
}

let dirty = false;

for (const [glob, lookups] of Object.entries(rules)) {
  const url = new URL(glob, import.meta.url);

  for (const { path } of expandGlobSync(url, { includeDirs: false })) {
    console.log(path);
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
      Deno.writeTextFileSync(path, newText);
      dirty = true;
    }
  }
}

Deno.exit(dirty ? 1 : 0);
