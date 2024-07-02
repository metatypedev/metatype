// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { join, resolve } from "std/path/mod.ts";
import { assert, assertRejects } from "std/assert/mod.ts";
import { randomSchema, reset } from "test-utils/database.ts";
import { TestModule } from "test-utils/test_module.ts";
import { $ } from "dax";
import { killProcess, LineReader, LineWriter } from "../../utils/process.ts";

const m = new TestModule(import.meta);

const tgName = "migration-failure-test";
/**
 * These tests use different ports for the virtual typegate instance to avoid
 * conflicts with one another when running in parallel.
 */

async function writeTypegraph(version: number | null, target = "migration.py") {
  if (version == null) {
    await m.shell(["bash", "-c", `cp ./templates/migration.py ${target}`]);
  } else {
    await m.shell([
      "bash",
      "select.sh",
      "templates/migration.py",
      `${version}`,
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
        `migration-failure-test:POSTGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
      ],
      // stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();

    const stderr = new LineReader(metadev.stderr);
    const stdin = new LineWriter(metadev.stdin);

    await stderr.readUntil((line) => {
      // console.log("meta dev>", line);
      return !$.stripAnsi(line).includes(
        "successfully deployed typegraph migration-failure-test from migration.py",
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
      await stderr.readUntil((line) => {
        // console.log("line:", line);
        return !line.includes("[select]");
      });

      await stdin.writeLine("3");
    });

    await stderr.readUntil((line) => {
      // console.log("meta dev>", line);
      return !$.stripAnsi(line).includes(
        "successfully deployed typegraph migration-failure-test",
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

    await stderr.close();
    await stdin.close();
    await killProcess(metadev);
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
    const tgDefFile = join(t.workingDir, "migration.py");

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
        `--secret=migration-failure-test:POSTGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
      ],
      // stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();

    const stderr = new LineReader(metadev.stderr);
    const stdin = new LineWriter(metadev.stdin);

    await stderr.readUntil((line) => {
      // console.log("line:", line);
      return !$.stripAnsi(line).includes(
        "successfully deployed typegraph migration-failure-test",
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
      "migration-failure-test/main",
    );
    console.log("Typegate migration dir", migrationsDir);

    await t.should("load second version of the typegraph", async () => {
      await writeTypegraph(1, tgDefFile);
      await stderr.readUntil((line) => {
        // console.log("line:", line);
        return !line.includes("[select]");
      });

      assert((await listSubdirs(migrationsDir)).length === 2);

      await stdin.writeLine("1");
    });

    await stderr.readUntil((line) => {
      // console.log("line:", line);
      return !line.includes("Removed migration directory");
    });

    await t.should("have removed latest migration", async () => {
      assert((await listSubdirs(migrationsDir)).length === 1);
    });

    await stderr.close();
    await stdin.close();
    await killProcess(metadev);
  },
);
