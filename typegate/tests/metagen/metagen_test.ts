// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { newTempDir } from "test-utils/dir.ts";
import { join } from "std/path/join.ts";
import { assertEquals } from "std/assert/mod.ts";

Meta.test("metagen rust builds", async (t) => {
  const tmpDir = await newTempDir();
  t.addCleanup(() => Deno.remove(tmpDir, { recursive: true }));

  const typegraphPath = join(
    import.meta.dirname!,
    "../../../examples/typegraphs/basic.ts",
  );
  const genCratePath = join(tmpDir, "mdk");

  Deno.writeTextFile(
    join(tmpDir, "metatype.yml"),
    `
typegates:
  dev:
    url: "http://localhost:7890"
    username: admin
    password: password
    env:
      TG_EXAMPLE_ENV_VAR: "example"

metagen:
  targets: 
    main:
      mdk_rust:
        path: ${genCratePath}
        typegraph_path: ${typegraphPath}
`,
  );

  // enclose the generated create in a lone workspace
  // to avoid Cargo from noticing the `metatype/Cargo.toml` worksapce
  Deno.writeTextFile(
    join(tmpDir, "Cargo.toml"),
    `
[workspace]
resolver = "2"
members = ["mdk/"]
`,
  );
  assertEquals(
    (await Meta.cli({
      env: {
        MCLI_LOADER_CMD: "deno run -A --config ../deno.jsonc",
      },
    }, ...`-C ${tmpDir} gen`.split(" "))).code,
    0,
  );
  assertEquals(
    (await t.shell("cargo build --target wasm32-wasi".split(" "), {
      currentDir: genCratePath,
    })).code,
    0,
  );
});
