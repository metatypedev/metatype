// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlob } from "std/fs/expand_glob.ts";
import { basename, dirname, fromFileUrl, join } from "std/path/mod.ts";
import { Meta } from "../../utils/mod.ts";
import { MetaTest } from "../../utils/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import { TypeGraphDS } from "../../../src/typegraph/mod.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));
const typegraphsDir = "examples/typegraphs";

// They are all listed here to enable running tests individually (with the only flag)
const list = [
  "authentication",
  "backend-for-frontend",
  "basic",
  "cors",
  "database",
  "deno",
  "example_rest",
  "execute",
  "faas-runner",
  "files-upload",
  "first-typegraph",
  "func-ctx",
  "func-gql",
  "func",
  "graphql-server",
  "graphql",
  "http-runtime",
  "iam-provider",
  "index",
  "injections",
  "jwt",
  "math",
  "metagen-deno",
  "metagen-py",
  "metagen-rs",
  "metagen-sdk",
  "microservice-orchestration",
  "oauth2",
  "policies",
  "prisma-runtime",
  "prisma",
  "programmable-api-gateway",
  "quick-start-project",
  "random-field",
  "rate",
  "reduce",
  "rest",
  "roadmap-policies",
  "roadmap-random",
  "temporal",
  "triggers",
] as const;

// files that does not have 2 versions -- TODO why?
const skip = [
  "docs",
  "functions",
  "policies-example",
  "runtimes",
  "typecheck",
  "types",
];

const prepare = {
  "metagen-rs": async (t: MetaTest) => {
    await t.should("build wasm artifacts", async () => {
      assertEquals(
        (
          await t.shell("bash build.sh".split(" "), {
            currentDir: "examples/typegraphs/metagen/rs",
            env: {
              MCLI_LOADER_CMD:
                "deno run -A --import-map=../typegate/import_map.json {filepath}",
            },
          })
        ).code,
        0
      );
    });
  },
} as Record<string, ((t: MetaTest) => Promise<void>) | undefined>;

Meta.test("website typegraph files", async (t) => {
  await t.should("list all python files", async () => {
    const pythonFiles = (
      await Array.fromAsync(expandGlob(join(typegraphsDir, "*.py")))
    )
      .map((f) => basename(f.path, ".py"))
      .filter((n) => !skip.includes(n));
    assertEquals(pythonFiles, list as any);
  });

  await t.should("list all typescript files", async () => {
    const tsFiles = (
      await Array.fromAsync(expandGlob(join(typegraphsDir, "*.ts")))
    )
      .map((f) => basename(f.path, ".ts"))
      .filter((n) => !skip.includes(n));
    assertEquals(tsFiles, list as any);
  });
});

for (const name of list) {
  Meta.test(
    {
      name: `serialize typegraphs: ${name}`,
    },
    async (t) => {
      const prepareFn = prepare[name];
      if (prepareFn) {
        await prepareFn(t);
      }

      let pyVersion: string;
      await t.should("serialize python typegraph", async () => {
        const { stdout } = await Meta.cli(
          { currentDir: "examples", env: { RUST_LOG: "trace" } },
          "serialize",
          "-f",
          `typegraphs/${name}.py`
        );
        pyVersion = stdout;
      });

      let tsVersion: string;
      await t.should("serialize typescript typegraph", async () => {
        const { stdout } = await Meta.cli(
          {
            currentDir: "examples",
            env: {
              RUST_LOG: "trace",
              MCLI_LOADER_CMD:
                "deno run -A --import-map=../typegate/import_map.json {filepath}",
            },
          },
          "serialize",
          "-f",
          `typegraphs/${name}.ts`
        );
        tsVersion = stdout;
      });

      await t.should("yields the same typegraphs", async () => {
        const py = JSON.parse(pyVersion) as TypeGraphDS[];
        const ts = JSON.parse(tsVersion) as TypeGraphDS[];
        await Promise.all([...py, ...ts].map((tg) => toComparable(t, tg)));
        assertEquals(py, ts);
      });
    }
  );
}

async function toComparable(t: MetaTest, tg: TypeGraphDS) {
  await Promise.all(
    tg.materializers.map(async (mat) => {
      if (mat.name === "function") {
        // FIXME: deno fmt sometimes no-ops on code formatted by prettier
        // having very opinionated configs to enforce the formatting looks sufficient for now
        const res = await t.shell(
          "deno fmt --no-semicolons --line-width 10 -".split(" "),
          {
            stdin: mat.data.script as string,
          }
        );
        mat.data.script = res.stdout;
      }
    })
  );
}
