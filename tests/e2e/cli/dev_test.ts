// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { join, resolve } from "@std/path";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { randomSchema, reset } from "test-utils/database.ts";
import { TestModule } from "test-utils/test_module.ts";
import { $ } from "@david/dax";
import { killProcess, Lines, LineWriter } from "../../utils/process.ts";
import { workspaceDir } from "../../utils/dir.ts";

const m = new TestModule(import.meta);

// both dev_test and deploy_test rely on the same typegraph
// we need to do different versions of the typegraph to avoid
// races during testing
const testCode = "dev";
const tgName = `migration-failure-test-${testCode}`;
/**
 * These tests use different ports for the virtual typegate instance to avoid
 * conflicts with one another when running in parallel.
 */

async function writeTypegraph(
  version: number | null,
  target = `migration_${testCode}.py`,
) {
  if (version == null) {
    await m.shell([
      "bash",
      "-c",
      `cat ./templates/migration.py | sed -e "s/migration_failure_test_code/migration_failure_test_${testCode}/" > ${target}`,
    ]);
  } else {
    await m.shell([
      "bash",
      "select.sh",
      "templates/migration.py",
      `${version}`,
      testCode,
      target,
    ]);
  }
}

Meta.test(
  {
    name: "meta dev: choose to reset the database",
    gitRepo: {
      content: {
        "metatype.yml": "metatype.yml",
      },
    },
  },
  async (t) => {
    const schema = randomSchema();
    const tgDefPath = join(t.workingDir, "migration.py");

    await t.should("load first version of the typegraph", async () => {
      await reset(tgName, schema);
      await writeTypegraph(null, tgDefPath);
    });

    const metadev = new Deno.Command("meta", {
      cwd: t.workingDir,
      args: [
        "dev",
        "--target=dev",
        `--gate=http://localhost:${t.port}`,
        "--secret",
        `${tgName}:POSTGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
      ],
      // stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();
    const stderr = new Lines(metadev.stderr);
    const stdin = new LineWriter(metadev.stdin);

    t.addCleanup(async () => {
      await stderr.close();
      await stdin.close();
      await killProcess(metadev);
    });

    await stderr.readWhile((line) => {
      // console.log("meta dev>", line);
      return !$.stripAnsi(line).includes(
        `successfully deployed typegraph ${tgName} from migration.py`,
      );
    });

    await t.should("insert records", async () => {
      const e = t.getTypegraphEngine(tgName);
      if (!e) {
        throw new Error("typegraph not found");
      }
      await gql`
        mutation {
          createRecord(data: {}) {
            id
          }
        }
      `
        .expectData({
          createRecord: {
            id: 1,
          },
        })
        .on(e);
    });

    await t.should("load second version of the typegraph", async () => {
      await writeTypegraph(1, tgDefPath);
      await stderr.readWhile((line) => {
        // console.log("line:", line);
        return !line.includes("[select]");
      });

      await stdin.writeLine("3");
    });

    await stderr.readWhile((line) => {
      // console.log("meta dev>", line);
      return !$.stripAnsi(line).includes(
        `successfully deployed typegraph ${tgName}`,
      );
    });

    await t.should("database be empty", async () => {
      const e = t.getTypegraphEngine(tgName);
      if (!e) {
        throw new Error("typegraph not found");
      }
      await gql`
        query {
          findRecords {
            id
            age
          }
        }
      `
        .expectData({
          findRecords: [],
        })
        .on(e);
    });
  },
);

async function listSubdirs(path: string): Promise<string[]> {
  const subdirs: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory) {
      subdirs.push(entry.name);
    }
  }
  return subdirs;
}

Meta.test(
  {
    name: "meta dev: remove latest migration",
    gitRepo: {
      content: {
        "metatype.yml": "metatype.yml",
      },
    },
  },
  async (t) => {
    const schema = randomSchema();
    const tgDefFile = join(t.workingDir, `migration.py`);

    await t.should("have no migration file", async () => {
      await assertRejects(() =>
        Deno.lstat(resolve(t.workingDir, "prisma-migrations"))
      );
    });

    await t.should("load first version of the typegraph", async () => {
      await reset(tgName, schema);
      await writeTypegraph(null, tgDefFile);
    });

    const metadev = new Deno.Command("meta", {
      cwd: t.workingDir,
      args: [
        "dev",
        "--target=dev",
        `--gate=http://localhost:${t.port}`,
        `--secret=${tgName}:POSTGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
      ],
      // stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();

    const stderr = new Lines(metadev.stderr);
    const stdin = new LineWriter(metadev.stdin);

    t.addCleanup(async () => {
      await stderr.close();
      await stdin.close();
      await killProcess(metadev);
    });

    await stderr.readWhile((line) => {
      console.log("line:", line);
      return !$.stripAnsi(line).includes(
        `successfully deployed typegraph ${tgName}`,
      );
    });

    await t.should("have created migration", async () => {
      await Deno.lstat(resolve(t.workingDir, "prisma-migrations"));
    });

    await t.should("insert records", async () => {
      const e = t.getTypegraphEngine(tgName);
      if (!e) {
        throw new Error("typegraph not found");
      }
      await gql`
        mutation {
          createRecord(data: {}) {
            id
          }
        }
      `
        .expectData({
          createRecord: {
            id: 1,
          },
        })
        .on(e);
    });

    const migrationsDir = resolve(
      t.workingDir,
      "prisma-migrations",
      `${tgName}/main`,
    );
    console.log("Typegate migration dir", migrationsDir);

    await t.should("load second version of the typegraph", async () => {
      await writeTypegraph(1, tgDefFile);
      await stderr.readWhile((line) => {
        // console.log("line:", line);
        return !line.includes("[select]");
      });

      assert((await listSubdirs(migrationsDir)).length === 2);

      await stdin.writeLine("1");
    });

    await stderr.readWhile((line) => {
      // console.log("line:", line);
      return !line.includes("Removed migration directory");
    });

    await t.should("have removed latest migration", async () => {
      assert((await listSubdirs(migrationsDir)).length === 1);
    });
  },
);

const examplesDir = $.path(workspaceDir).join("examples");

Meta.test({
  name: "meta dev with typegate",
}, async (t) => {
  await $`bash build.sh`.cwd(examplesDir.join("typegraphs/metagen/rs"));

  const metadev = new Deno.Command("meta-full", {
    cwd: examplesDir.toString(),
    args: [
      "dev",
      `--main-url`,
      import.meta.resolve("../../../src/typegate/src/main.ts"),
      `--import-map-url`,
      import.meta.resolve("../../../import_map.json"),
      `--gate=http://localhost:0`,
    ],
    stdout: "piped",
    stderr: "piped",
    env: {
      MCLI_LOADER_CMD: "deno run -A --config deno.jsonc",
    },
  }).spawn();
  const stderr = new Lines(metadev.stderr);
  const stdout = new Lines(metadev.stdout);
  t.addCleanup(async () => {
    await stderr.close();
    await stdout.close();
    // FIXME: it still leaks the child typegate process even
    // though we the cli has a ctrl_c handler
    metadev.kill("SIGTERM");
    await metadev.status;
  });
  const deployed: [string, string][] = [];

  console.log(new Date());
  stdout.readWhile((line) => {
    console.log("meta-full dev>", line);
    return true;
  }, null);

  await stderr.readWhile((rawLine) => {
    const line = $.stripAnsi(rawLine);
    console.log("meta-full dev[E]>", line);
    if (line.match(/failed to deploy/i)) {
      throw new Error("error detected on line: " + rawLine);
    }
    const match = line.match(
      /successfully deployed typegraph ([\w_-]+) from (.+)$/,
    );
    if (match) {
      const prefix = "typegraphs/";
      if (!match[2].startsWith(prefix)) {
        throw new Error("unexpected");
      }
      deployed.push([match[2].slice(prefix.length), match[1]]);
    }
    return deployed.length < 42;
  }, 3 * 60 * 1000);

  await t.should("have deployed all the typegraphs", () => {
    // TODO use `meta list`
    assertEquals(deployed.sort(), [
      ["authentication.ts", "authentication"],
      ["backend-for-frontend.ts", "backend-for-frontend"],
      ["basic.ts", "basic-authentication"],
      ["cors.ts", "cors"],
      ["database.ts", "database"],
      ["deno.ts", "deno"],
      ["example_rest.ts", "example-rest"],
      ["execute.ts", "roadmap-execute"],
      ["faas-runner.ts", "faas-runner"],
      ["files-upload.ts", "files-upload"],
      ["first-typegraph.ts", "first-typegraph"],
      ["func-ctx.ts", "func-ctx"],
      ["func-gql.ts", "func-gql"],
      ["func.ts", "roadmap-func"],
      ["graphql-server.ts", "graphql-server"],
      ["graphql.ts", "graphql"],
      ["grpc.ts", "grpc"],
      ["http-runtime.ts", "http-runtime"],
      ["iam-provider.ts", "iam-provider"],
      ["index.ts", "homepage"],
      ["injections.ts", "injection-example"],
      ["jwt.ts", "jwt-authentication"],
      ["math.ts", "math"],
      ["metagen-deno.ts", "metagen-deno"],
      ["metagen-py.ts", "metagen-py"],
      ["metagen-rs.ts", "metagen-rs"],
      ["metagen-sdk.ts", "metagen-sdk"],
      ["microservice-orchestration.ts", "team-a"],
      ["microservice-orchestration.ts", "team-b"],
      ["oauth2.ts", "oauth2-authentication"],
      ["policies.ts", "policies"],
      ["prisma-runtime.ts", "prisma-runtime"],
      ["prisma.ts", "roadmap-prisma"],
      ["programmable-api-gateway.ts", "programmable-api-gateway"],
      ["quick-start-project.ts", "quick-start-project"],
      ["random-field.ts", "random-field"],
      ["rate.ts", "rate"],
      ["reduce.ts", "roadmap-reduce"],
      ["rest.ts", "roadmap-rest"],
      ["roadmap-policies.ts", "roadmap-policies"],
      ["roadmap-random.ts", "roadmap-random"],
      ["triggers.ts", "triggers"],
      ["union-either.ts", "union-either"],
    ]);
  });
});
