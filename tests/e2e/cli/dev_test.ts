// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta, sleep } from "test-utils/mod.ts";
import type { gql as _gql } from "test-utils/mod.ts";
import type { join as _join, resolve as _resolve } from "@std/path";
import {
  assert,
  assertEquals,
  type assertRejects as _assertRejects,
} from "@std/assert";
import type {
  randomSchema as _randomSchema,
  reset as _reset,
} from "test-utils/database.ts";
import { TestModule } from "test-utils/test_module.ts";
import { $ } from "@david/dax";
import {
  ctrlcProcess,
  enumerateAllChildUNIX,
  isPIDAliveUNIX,
  Lines,
  type LineWriter as _LineWriter,
  type termProcess as _termProcess,
} from "../../utils/process.ts";
import { workspaceDir } from "../../utils/dir.ts";
import { fileURLToPath } from "node:url";

const m = new TestModule(import.meta);

// both dev_test and deploy_test rely on the same typegraph
// we need to do different versions of the typegraph to avoid
// races during testing
const testCode = "dev";
const _tgName = `migration-failure-test-${testCode}`;
/**
 * These tests use different ports for the virtual typegate instance to avoid
 * conflicts with one another when running in parallel.
 */

async function _writeTypegraph(
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

//Meta.test(
//  {
//    name: "meta dev: choose to reset the database",
//    gitRepo: {
//      content: {
//        "metatype.yml": "metatype.yml",
//      },
//    },
//  },
//  async (t) => {
//    const schema = randomSchema();
//    const tgDefPath = join(t.workingDir, "migration.py");
//
//    await t.should("load first version of the typegraph", async () => {
//      await reset(tgName, schema);
//      await writeTypegraph(null, tgDefPath);
//    });
//
//    const metadev = new Deno.Command("meta", {
//      cwd: t.workingDir,
//      args: [
//        "dev",
//        "--target=dev",
//        `--gate=http://localhost:${t.port}`,
//        "--secret",
//        `${tgName}:POSTGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
//      ],
//      // stdout: "piped",
//      stderr: "piped",
//      stdin: "piped",
//    }).spawn();
//    const stderr = new Lines(metadev.stderr);
//    const stdin = new LineWriter(metadev.stdin);
//
//    t.addCleanup(async () => {
//      await stderr.close();
//      await stdin.close();
//      await termProcess(metadev);
//    });
//
//    await stderr.readWhile((line) => {
//      // console.log("meta dev>", line);
//      return !$.stripAnsi(line).includes(
//        `successfully deployed typegraph ${tgName} from migration.py`,
//      );
//    });
//
//    await t.should("insert records", async () => {
//      const e = t.getTypegraphEngine(tgName);
//      if (!e) {
//        throw new Error("typegraph not found");
//      }
//      await gql`
//        mutation {
//          createRecord(data: {}) {
//            id
//          }
//        }
//      `
//        .expectData({
//          createRecord: {
//            id: 1,
//          },
//        })
//        .on(e);
//    });
//
//    await t.should("load second version of the typegraph", async () => {
//      await writeTypegraph(1, tgDefPath);
//      await stderr.readWhile((line) => {
//        // console.log("line:", line);
//        return !line.includes("[select]");
//      });
//
//      await stdin.writeLine("3");
//    });
//
//    await stderr.readWhile((line) => {
//      // console.log("meta dev>", line);
//      return !$.stripAnsi(line).includes(
//        `successfully deployed typegraph ${tgName}`,
//      );
//    });
//
//    await t.should("database be empty", async () => {
//      const e = t.getTypegraphEngine(tgName);
//      if (!e) {
//        throw new Error("typegraph not found");
//      }
//      await gql`
//        query {
//          findRecords {
//            id
//            age
//          }
//        }
//      `
//        .expectData({
//          findRecords: [],
//        })
//        .on(e);
//    });
//  },
//);

async function _listSubdirs(path: string): Promise<string[]> {
  const subdirs: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory) {
      subdirs.push(entry.name);
    }
  }
  return subdirs;
}

//Meta.test(
//  {
//    name: "meta dev: remove latest migration",
//    gitRepo: {
//      content: {
//        "metatype.yml": "metatype.yml",
//      },
//    },
//  },
//  async (t) => {
//    const schema = randomSchema();
//    const tgDefFile = join(t.workingDir, `migration.py`);
//
//    await t.should("have no migration file", async () => {
//      await assertRejects(() =>
//        Deno.lstat(resolve(t.workingDir, "prisma-migrations"))
//      );
//    });
//
//    await t.should("load first version of the typegraph", async () => {
//      await reset(tgName, schema);
//      await writeTypegraph(null, tgDefFile);
//    });
//
//    const metadev = new Deno.Command("meta", {
//      cwd: t.workingDir,
//      args: [
//        "dev",
//        "--target=dev",
//        `--gate=http://localhost:${t.port}`,
//        `--secret=${tgName}:POSTGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
//      ],
//      // stdout: "piped",
//      stderr: "piped",
//      stdin: "piped",
//    }).spawn();
//
//    const stderr = new Lines(metadev.stderr);
//    const stdin = new LineWriter(metadev.stdin);
//
//    t.addCleanup(async () => {
//      await stderr.close();
//      await stdin.close();
//      await termProcess(metadev);
//    });
//
//    await stderr.readWhile((line) => {
//      console.log("line:", line);
//      return !$.stripAnsi(line).includes(
//        `successfully deployed typegraph ${tgName}`,
//      );
//    });
//
//    await t.should("have created migration", async () => {
//      await Deno.lstat(resolve(t.workingDir, "prisma-migrations"));
//    });
//
//    await t.should("insert records", async () => {
//      const e = t.getTypegraphEngine(tgName);
//      if (!e) {
//        throw new Error("typegraph not found");
//      }
//      await gql`
//        mutation {
//          createRecord(data: {}) {
//            id
//          }
//        }
//      `
//        .expectData({
//          createRecord: {
//            id: 1,
//          },
//        })
//        .on(e);
//    });
//
//    const migrationsDir = resolve(
//      t.workingDir,
//      "prisma-migrations",
//      `${tgName}/main`,
//    );
//    console.log("Typegate migration dir", migrationsDir);
//
//    await t.should("load second version of the typegraph", async () => {
//      await writeTypegraph(1, tgDefFile);
//      await stderr.readWhile((line) => {
//        // console.log("line:", line);
//        return !line.includes("[select]");
//      });
//
//      assert((await listSubdirs(migrationsDir)).length === 2);
//
//      await stdin.writeLine("1");
//    });
//
//    await stderr.readWhile((line) => {
//      // console.log("line:", line);
//      return !line.includes("Removed migration directory");
//    });
//
//    await t.should("have removed latest migration", async () => {
//      assert((await listSubdirs(migrationsDir)).length === 1);
//    });
//  },
//);

const examplesDir = $.path(workspaceDir).join("examples");

const skipDeployed = new Set(["play.ts"]);

const expectedDeployed = [
  ["authentication.ts", "authentication"],
  ["backend-for-frontend.ts", "backend-for-frontend"],
  ["basic.ts", "basic-authentication"],
  ["cors.ts", "cors"],
  ["database.ts", "database"],
  ["deno-import.ts", "deno-import"],
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
  ["python.ts", "python"],
  ["quick-start-project.ts", "quick-start-project"],
  ["random-field.ts", "random-field"],
  ["rate.ts", "rate"],
  ["reduce.ts", "roadmap-reduce"],
  ["rest.ts", "roadmap-rest"],
  ["roadmap-policies.ts", "roadmap-policies"],
  ["roadmap-random.ts", "roadmap-random"],
  ["triggers.ts", "triggers"],
  ["union-either.ts", "union-either"],
];

Meta.test(
  {
    name: "meta dev with typegate",
  },
  async (t) => {
    await $`bash build.sh`.cwd(examplesDir.join("typegraphs/metagen/rs"));

    console.log({
      examplesDir,
    });
    const metadev = new Deno.Command("meta-full", {
      cwd: examplesDir.toString(),
      args: [
        "dev",
        `--main-url`,
        import.meta.resolve("../../../src/typegate/src/main.ts"),
        `--import-map-url`,
        fileURLToPath(import.meta.resolve("../../../import_map.json")),
        `--gate=http://localhost:0`,
      ],
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
      env: {
        MCLI_LOADER_CMD: "deno run -A --config deno.jsonc",
      },
    }).spawn();
    const stderr = new Lines(metadev.stderr);
    const stdout = new Lines(metadev.stdout);

    const deployed: [string, string][] = [];

    console.log(new Date(), "waiting for dev test");
    stdout.readWhile((line) => {
      console.log("meta-full dev>", line);
      return true;
    }, null);

    await stderr.readWhile(
      (rawLine) => {
        console.log("meta-full dev[E]>", rawLine);
        const line = $.stripAnsi(rawLine);
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
          const file = match[2].slice(prefix.length);
          if (!skipDeployed.has(file)) {
            deployed.push([file, match[1]]);
          }
        }
        return deployed.length != expectedDeployed.length;
      },
      3 * 60 * 1000,
    );

    await t.should("have deployed all the typegraphs", () => {
      // TODO use `meta list`
      assertEquals(deployed.sort(), expectedDeployed);
    });

    await t.should("kill meta-full process", async () => {
      const parentPID = metadev.pid;
      console.log("meta-full PID", parentPID);

      await metadev.stdin.close();
      await stdout.close();
      await stderr.close();

      const childrenPIDs = await enumerateAllChildUNIX(parentPID);
      console.log("children", childrenPIDs);

      // FIXME: SIGTERM not working in tests
      // Also tried a manual kill -SIGTERM PID_THIS_META_FULL, same issue.
      // But it will work with "./target/debug/meta dev" or "cargo run --features typegate  -p meta-cli -- dev"
      // await termProcess(metadev);

      await ctrlcProcess(metadev);

      // No handle for the children status
      // This is the simplest way to get around it
      await sleep(10000);
      assert(
        (await isPIDAliveUNIX(parentPID)) == false,
        `Parent ${parentPID} should be cleaned up`,
      );

      for (const child of childrenPIDs) {
        assert(
          (await isPIDAliveUNIX(child)) == false,
          `Child PID ${child} should be cleaned up`,
        );
      }
    });
  },
);
