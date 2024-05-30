// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../utils/mod.ts";
import { join } from "std/path/join.ts";
import { assertEquals } from "std/assert/mod.ts";

/* Meta.test("metagen rust builds", async (t) => {
  const tmpDir = t.tempDir;

  const typegraphPath = join(
    import.meta.dirname!,
    "../../../examples/typegraphs/basic.ts",
  );
  const genCratePath = join(tmpDir, "mdk");

  await Deno.writeTextFile(
    join(tmpDir, "metatype.yml"),
    `
typegates:
  dev:
    url: "http://localhost:7890"
    username: admin
    password: password

metagen:
  targets:
    main:
      - generator: mdk_rust
        path: ${genCratePath}
        typegraph_path: ${typegraphPath}
`,
  );

  // enclose the generated create in a lone workspace
  // to avoid Cargo from noticing the `metatype/Cargo.toml` worksapce
  await Deno.writeTextFile(
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
        RUST_BACKTRACE: "1",
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

Meta.test("metagen python runs on cyclic types", async (t) => {
  const typegraphPath = join(
    import.meta.dirname!,
    "typegraphs/python.py",
  );
  const basePath = join(t.tempDir, "mdk");

  Deno.writeTextFile(
    join(t.tempDir, "metatype.yml"),
    `
typegates:
  dev:
    url: "http://localhost:7890"
    username: admin1
    password: password2

metagen:
  targets:
    my_target:
      - generator: mdk_python
        path: ${basePath}
        typegraph_path: ${typegraphPath}
`,
  );

  assertEquals(
    (await Meta.cli({}, ...`-C ${t.tempDir} gen mdk my_target`.split(" ")))
      .code,
    0,
  );
});

Meta.test("Metagen within sdk", async (t) => {
  const workspace = "./workspace";
  const targetName = "my_target";
  const genConfig = {
    targets: {
      my_target: [
        {
          generator: "mdk_rust",
          typegraph: "example-metagen",
          path: "some/base/path/rust",
        },
        {
          generator: "mdk_python",
          typegraph: "example-metagen",
          path: "some/base/path/python",
        },
        {
          generator: "mdk_typescript",
          typegraph: "example-metagen",
          path: "some/base/path/ts",
        },
      ],
    },
  };

  const sdkResults = [] as Array<string>;

  await t.should("Run metagen within typescript", async () => {
    const { tg } = await import("./typegraphs/metagen.mjs");
    const { Metagen } = await import("@typegraph/sdk/metagen.js");
    const metagen = new Metagen(workspace, genConfig);
    const generated = metagen.dryRun(tg, targetName);
    await t.assertSnapshot(generated);

    sdkResults.push(JSON.stringify(generated, null, 2));
  });

  await t.should("Run metagen within python", async () => {
    const typegraphPath = join(
      import.meta.dirname!,
      "./typegraphs/metagen.py",
    );
    const command = new Deno.Command("python3", {
      args: [typegraphPath],
      env: {
        workspace_path: workspace,
        gen_config: JSON.stringify(genConfig),
        target_name: targetName,
      },
      stderr: "piped",
      stdout: "piped",
    });

    const child = command.spawn();
    const output = await child.output();
    if (output.success) {
      const generated = JSON.parse(new TextDecoder().decode(output.stdout));
      await t.assertSnapshot(generated);

      sdkResults.push(JSON.stringify(generated, null, 2));
    } else {
      const err = new TextDecoder().decode(output.stderr);
      throw new Error(`metagen python: ${err}`);
    }
  });

  if (sdkResults.length > 0) {
    await t.should("SDKs should produce same metagen output", () => {
      const [fromTs, fromPy] = sdkResults;
      assertEquals(fromTs, fromPy);
    });
  }
}); */

Meta.test("metagen table suite", async (t) => {
  const typegraphPath = join(
    import.meta.dirname!,
    "typegraphs/identities.ts",
  );

  const scriptsPath = join(
    import.meta.dirname!,
    "typegraphs/identities",
  );
  const genCratePath = join(scriptsPath, "rs");
  const genPyPath = join(scriptsPath, "py");
  const genTsPath = join(scriptsPath, "ts");

  await Deno.writeTextFile(
    join(t.tempDir, "metatype.yml"),
    `
typegates:
  dev:
    url: "http://localhost:7890"
    username: admin
    password: password

metagen:
  targets:
    main:
      - generator: mdk_rust
        path: ${genCratePath}
        typegraph_path: ${typegraphPath}
      - generator: mdk_python
        path: ${genPyPath}
        typegraph_path: ${typegraphPath}
      - generator: mdk_typescript
        path: ${genTsPath}
        typegraph_path: ${typegraphPath}
  `,
  );

  assertEquals(
    (await Meta.cli({
      env: {
        MCLI_LOADER_CMD: "deno run -A --config ../deno.jsonc",
        RUST_BACKTRACE: "1",
      },
    }, ...`-C ${scriptsPath} gen`.split(" "))).code,
    0,
  );

  await t.should("rust tests", async () => {
    assertEquals(
      (await t.shell("bash build.sh".split(" "), {
        currentDir: genCratePath,
      })).code,
      0,
    );
    // await using engine = await t.engine("metagen/typegraphs/identities.ts");
  });
});
