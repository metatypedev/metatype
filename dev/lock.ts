import { parse } from "https://deno.land/std@0.170.0/encoding/yaml.ts";
import { expandGlobSync } from "https://deno.land/std@0.170.0/fs/expand_glob.ts";

type Rules = Record<string, string>;

const rules: Record<string, Rules> = {
  "../rust-toolchain.toml": {
    '(channel = ").+(")': "RUST_VERSION",
  },
  "../.github/workflows/tests.yml": {
    '(  PYTHON_VERSION: ").+(")': "PYTHON_VERSION",
    '(  POETRY_VERSION: ").+(")': "POETRY_VERSION",
    '(  RUST_VERSION: ").+(")': "RUST_VERSION",
    '(  DENO_BINDGEN_URL: ").+(")': "DENO_BINDGEN_URL",
    '(  DENO_VERSION: ").+(")': "DENO_VERSION",
    '(  PNPM_VERSION: ").+(")': "PNPM_VERSION",
    '(  NODE_VERSION: ").+(")': "NODE_VERSION",
  },
  "../.github/workflows/release.yml": {
    '(  PYTHON_VERSION: ").+(")': "PYTHON_VERSION",
    '(  POETRY_VERSION: ").+(")': "POETRY_VERSION",
    '(  RUST_VERSION: ").+(")': "RUST_VERSION",
    '(  DENO_BINDGEN_URL: ").+(")': "DENO_BINDGEN_URL",
    '(  DENO_VERSION: ").+(")': "DENO_VERSION",
  },
  "../.github/workflows/publish-website.yml": {
    '(  PNPM_VERSION: ").+(")': "PNPM_VERSION",
    '(  NODE_VERSION: ").+(")': "NODE_VERSION",
  },
  "../typegraph/typegraph/__init__.py": {
    '(version = ").+(")': "METATYPE_VERSION",
  },
  "../**/pyproject.toml": {
    '(version = ").+(")': "METATYPE_VERSION",
  },
  "../**/Cargo.toml": {
    '(version = ").+(")': "METATYPE_VERSION",
  },
  "../dev/Dockerfile": {
    "(ARG DENO_VERSION=).*()": "DENO_VERSION",
    "(ARG DENO_BINDGEN_URL=).*()": "DENO_BINDGEN_URL",
    "(ARG RUST_VERSION=).*()": "RUST_VERSION",
  },
  "../dev/Dockerfile.test": {
    "(ARG DENO_VERSION=).*()": "DENO_VERSION",
    "(ARG DENO_BINDGEN_URL=).*()": "DENO_BINDGEN_URL",
    "(ARG RUST_VERSION=).*()": "RUST_VERSION",
    "(ARG POETRY_VERSION=).*()": "POETRY_VERSION",
    "(ARG PYTHON_VERSION=).*()": "PYTHON_VERSION",
  },
};

const lock = parse(
  Deno.readTextFileSync(new URL("lock.yml", import.meta.url)),
) as Record<string, unknown>;

let dirty = false;

for (const [glob, lookups] of Object.entries(rules)) {
  const url = new URL(glob, import.meta.url);

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
      Deno.writeTextFileSync(path, newText);
      dirty = true;
    }
  }
}

Deno.exit(dirty ? 1 : 0);
