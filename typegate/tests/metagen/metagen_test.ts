// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../utils/mod.ts";
import { join } from "std/path/join.ts";
import { resolve } from "std/path/resolve.ts";
import { assertEquals } from "std/assert/mod.ts";
import { GraphQLQuery } from "../utils/query/graphql_query.ts";
import { JSONValue } from "../../src/utils.ts";
import { testDir } from "../utils/dir.ts";
import $ from "dax";
import { z as zod } from "zod";

const denoJson = resolve(testDir, "../deno.jsonc");

Meta.test("metagen rust builds", async (t) => {
  const tmpDir = t.tempDir;

  const typegraphPath = join(import.meta.dirname!, "./typegraphs/metagen.ts");
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
        stubbed_runtimes: ["python"]
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
    (
      await Meta.cli(
        {
          env: {
            MCLI_LOADER_CMD: `deno run -A --config ${denoJson}`,
            RUST_BACKTRACE: "1",
          },
        },
        ...`-C ${tmpDir} gen`.split(" "),
      )
    ).code,
    0,
  );
  assertEquals(
    (
      await t.shell("cargo build --target wasm32-wasi".split(" "), {
        currentDir: genCratePath,
      })
    ).code,
    0,
  );
});

Meta.test("metagen python runs on cyclic types", async (t) => {
  const typegraphPath = join(import.meta.dirname!, "typegraphs/python.py");
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
    (await Meta.cli({}, ...`-C ${t.tempDir} gen my_target`.split(" "))).code,
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
          stubbed_runtimes: ["python"],
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
          stubbed_runtimes: ["python"],
        },
      ],
    },
  };

  const sdkResults = [] as Array<string>;

  await t.should("Run metagen within typescript", async () => {
    const { tg } = await import("./typegraphs/metagen.ts");
    const { Metagen } = await import("@typegraph/sdk/metagen.ts");
    const metagen = new Metagen(workspace, genConfig);
    const generated = metagen.dryRun(tg, targetName);
    await t.assertSnapshot(
      Object.entries(generated).sort(([keyA], [keyB]) =>
        keyA.localeCompare(keyB)
      ),
    );

    sdkResults.push(JSON.stringify(generated, null, 2));
  });

  await t.should("Run metagen within python", async () => {
    const typegraphPath = join(import.meta.dirname!, "./typegraphs/metagen.py");
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
      const stdout = new TextDecoder().decode(output.stdout);
      const generated = JSON.parse(stdout);
      await t.assertSnapshot(
        Object.entries(generated).sort(([keyA], [keyB]) =>
          keyA.localeCompare(keyB)
        ),
      );

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
});

Meta.test("mdk table suite", async (metaTest) => {
  const scriptsPath = join(import.meta.dirname!, "typegraphs/identities");
  const genCratePath = join(scriptsPath, "rs");
  // const genPyPath = join(scriptsPath, "py");
  // const genTsPath = join(scriptsPath, "ts");

  assertEquals(
    (
      await Meta.cli(
        {
          env: {
            // RUST_BACKTRACE: "1",
          },
        },
        ...`-C ${scriptsPath} gen`.split(" "),
      )
    ).code,
    0,
  );
  const compositesQuery = `query ($data: composites) {
        data: prefix_composites(
          data: $data
        ) {
          opt
          either  {
            ... on branch2 {
              branch2
            }
            ... on primitives{
              str
              enum
              uuid
              email
              ean
              json
              uri
              date
              datetime
              int
              float
              boolean
            }
          }
          union
          list
        }
      }`;
  const cases = [
    {
      skip: true,
      name: "cycles",
      query: `query ($data: cycles1) {
        data: prefix_cycles(
          data: $data
        ) { # cycles1
          to2 { # cycles2
            ... on branch33B { # cycles3
              to2 { # cycles2
                ...on cycles1 { # cycles1
                  phantom1
                }
                ...on branch33A { #cycles3
                  phantom3a
                }
                ...on branch33B { #cycles3
                  phantom3b
                }
              }
            }
            ... on branch33A { #cycles3
              to1 { # cycles1
                list3 { #cycles3
                  ... on branch33A {
                    phantom3a
                  }
                  ... on branch33B {
                    to2 { #cycles2
                      ... on cycles1 { #cycles 1
                        phantom1
                      }
                      ... on branch33A { #cycles3
                        phantom3a
                      }
                      ... on branch33B { #cycles3
                        phantom3b
                      }
                    }
                  }
                }
              }
            }
            ... on cycles1 { #cycles1
              phantom1
            }
          }
        }
      }`,
      vars: {
        data: {
          // cycles 1
          to2: {
            //cycles 2
            phantom3a: "phantom",
            to1: {
              // cycles2/variant cycle3
              // cycles1
              list3: [
                {
                  //cycles3
                  to2: {
                    // cycles2
                    // cycles2/variant cycles1
                    to2: null,
                    phantom1: "phantom",
                  },
                },
              ],
            },
          },
        } as Record<string, JSONValue>,
      },
    },
    {
      name: "simple_cyles",
      query: `query ($data: primitives) {
        data: prefix_simple_cycles(
          data: $data
        ) {
          to2 {
            to3 {
              to1 {
                phantom1
              }
            }
          }
        }
      }`,
      vars: {
        data: {
          to2: {
            to3: {
              to1: {
                phantom1: null,
              },
            },
          },
        },
      } as Record<string, JSONValue>,
    },
    {
      name: "primtives",
      query: `query ($data: primitives) {
        data: prefix_primitives(
          data: $data
        ) {
          str
          enum
          uuid
          email
          ean
          json
          uri
          date
          datetime
          int
          float
          boolean
        }
      }`,
      vars: {
        data: {
          str: "bytes",
          enum: "tree",
          uuid: "a963f88a-52f2-46b0-9279-ed2910ac2ca5",
          email: "contact@example.com",
          ean: "0799439112766",
          json: JSON.stringify({ foo: "bar" }),
          uri: "https://metatype.dev",
          date: "2024-12-24",
          datetime: new Date().toISOString(),
          int: 1,
          float: 1.0,
          boolean: true,
        },
      } as Record<string, JSONValue>,
    },
    {
      name: "composites 1",
      query: compositesQuery,
      vars: {
        data: {
          opt: "optional",
          either: {
            str: "bytes",
            enum: "tree",
            uuid: "a963f88a-52f2-46b0-9279-ed2910ac2ca5",
            email: "contact@example.com",
            ean: "0799439112766",
            json: JSON.stringify({ foo: "bar" }),
            uri: "https://metatype.dev",
            date: "2024-12-24",
            datetime: new Date().toISOString(),
            int: 1,
            float: 1.0,
            boolean: true,
          },
          union: ["grey", "beige"],
          list: ["open", "ware"],
        },
      },
    },
    {
      name: "composites 2",
      query: compositesQuery,
      vars: {
        data: {
          either: {
            branch2: "openware",
          },
          union: "open@wa.re",
          list: ["open", "ware"],
          opt: null,
        } as Record<string, JSONValue>,
      },
    },
  ];

  await metaTest.should("build rust crate", async () => {
    assertEquals(
      (
        await metaTest.shell("bash build.sh".split(" "), {
          currentDir: genCratePath,
        })
      ).code,
      0,
    );
  });
  await using engine = await metaTest.engine(
    "metagen/typegraphs/identities.py",
  );
  for (const prefix of ["rs", "ts", "py"]) {
    await metaTest.should(`mdk data go round ${prefix}`, async (t) => {
      for (const { name, vars, query, skip } of cases) {
        if (skip) {
          continue;
        }
        await t.step(name, async () => {
          await new GraphQLQuery(
            query.replaceAll("prefix", prefix),
            {},
            {},
            {},
            [],
          )
            .withVars(vars)
            .expectData(vars)
            .on(engine);
        });
      }
    });
  }
});

Meta.test({
  name: "client table suite",
}, async (metaTest) => {
  const scriptsPath = join(import.meta.dirname!, "typegraphs/sample");

  assertEquals(
    (
      await Meta.cli(
        {
          env: {
            // RUST_BACKTRACE: "1",
          },
        },
        ...`-C ${scriptsPath} gen`.split(" "),
      )
    ).code,
    0,
  );
  const expectedSchemaQ = zod.object({
    user: zod.object({
      id: zod.string(),
      email: zod.string(),
      post1: zod.object({
        id: zod.string(),
        slug: zod.string(),
        title: zod.string(),
      }).array(),
      post2: zod.object({
        // NOTE: no id
        slug: zod.string(),
        title: zod.string(),
      }).array(),
    }),
    posts: zod.object({
      id: zod.string(),
      slug: zod.string(),
      title: zod.string(),
    }),
    scalarNoArgs: zod.string(),
  });
  const expectedSchemaM = zod.object({
    scalarArgs: zod.string(),
    compositeNoArgs: zod.object({
      id: zod.string(),
      slug: zod.string(),
      title: zod.string(),
    }),
    compositeArgs: zod.object({
      id: zod.string(),
      slug: zod.string(),
      title: zod.string(),
    }),
  });
  const expectedSchema = zod.tuple([
    expectedSchemaQ,
    expectedSchemaQ,
    expectedSchemaM,
    expectedSchemaQ,
    expectedSchemaM,
  ]);
  const cases = [
    {
      skip: false,
      name: "client_ts",
      // NOTE: dax replaces commands to deno with
      // commands to xtask so we go through bah
      command: $`bash -c "deno run -A main.ts"`.cwd(
        join(scriptsPath, "ts"),
      ),
      expected: expectedSchema,
    },
    {
      name: "client_py",
      command: $`python3 main.py`.cwd(
        join(scriptsPath, "py"),
      ),
      expected: expectedSchema,
    },
    {
      name: "client_rs",
      command: $`cargo run`.cwd(
        join(scriptsPath, "rs"),
      ),
      expected: expectedSchema,
    },
  ];

  await using _engine = await metaTest.engine(
    "metagen/typegraphs/sample.ts",
  );
  for (const { name, command, expected, skip } of cases) {
    if (skip) {
      continue;
    }
    await metaTest.should(name, async () => {
      const res = await command
        .env({ "TG_PORT": metaTest.port.toString() })
        .json();
      expected.parse(res);
    });
  }
});
