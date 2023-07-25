// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../../src/engine.ts";
import { join } from "std/path/mod.ts";
import { PrismaMigrate } from "../../src/runtimes/prisma_migration.ts";
import * as native from "native";
import { PrismaRuntime, PrismaRuntimeDS } from "../../src/runtimes/prisma.ts";

import { ensure } from "../../src/utils.ts";
import { testDir } from "./dir.ts";

export async function dropSchemas(engine: Engine) {
  const runtimes = engine.tg.runtimeReferences.filter((r) =>
    r instanceof PrismaRuntime
  ) as PrismaRuntime[];

  for (const runtime of runtimes) {
    const secret = engine.tg.tg.runtimes.find((rt) =>
      rt.data.name === runtime.name
    )?.data.connection_string_secret;
    ensure(!!secret, `no secret for runtime ${runtime.name}`);

    const connection_string = engine.tg.secretManager.secretOrFail(
      secret as string,
    );
    const schema = new URL(connection_string).searchParams.get("schema");
    ensure(
      !!schema,
      `no schema for connection string ${connection_string![1]}`,
    );

    const res = await runtime.query(`
        mutation { 
          executeRaw(
            query: "DROP SCHEMA IF EXISTS \\"${schema}\\" CASCADE",
            parameters: "[]",
          )
        }
      `);

    if (res.errors) {
      console.error(JSON.stringify(res.errors));
      throw new Error(`cannot drop schema ${schema}`);
    }
  }
}

export async function recreateMigrations(engine: Engine) {
  const runtimes = engine.tg.tg.runtimes.filter(
    (rt) => rt.name === "prisma",
  ) as unknown[] as PrismaRuntimeDS[];
  const migrationsBaseDir = join(testDir, "prisma-migrations");

  for (const runtime of runtimes) {
    const prisma = new PrismaMigrate(engine, runtime, null);
    const { migrations } = await prisma.create({
      name: "init",
      apply: true,
    } as any);
    const dest = join(migrationsBaseDir, engine.tg.name, runtime.data.name);
    const res = await native.unpack({ dest, migrations });
    if (res !== "Ok") {
      throw new Error(res.Err.message);
    }
  }
}

export async function removeMigrations(engine: Engine) {
  await Deno.remove(join(testDir, "prisma-migrations", engine.rawName), {
    recursive: true,
  }).catch(() => {});
}
