// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { join } from "std/path/mod.ts";
import { Engine } from "../../src/engine.ts";
import { PrismaRuntimeDS } from "../../src/runtimes/prisma.ts";
import { PrismaMigrate } from "../../src/runtimes/prisma_migration.ts";
import { gql, testDir } from "../utils.ts";
import * as native from "native";
import { MetaTest, ParseOptions } from "../utils/metatest.ts";
import { TGRuntime } from "../../src/types/typegraph.ts";

export async function init(
  t: MetaTest,
  tgPath: string,
  migrate = true,
  opts: ParseOptions = {},
): Promise<Engine> {
  const engine = await t.pythonFile(tgPath, opts);

  await t.should("drop schema", async () => {
    await gql`
      mutation M {
        dropSchema
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectData({
        dropSchema: 0,
      })
      .on(engine);
  });

  if (migrate) {
    await t.should("recreate migrations", async () => {
      const runtimes = engine.tg.tg.runtimes.filter(
        (rt: TGRuntime) => rt.name === "prisma",
      ) as unknown[] as PrismaRuntimeDS[];

      const migrationsBaseDir = join(testDir, "prisma-migrations");

      for await (const runtime of runtimes) {
        console.log(runtime);
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
    });
  } else {
    await t.should("remove migrations", async () => {
      await Deno.remove(join(testDir, "prisma-migrations", engine.name), {
        recursive: true,
      }).catch(() => {});
    });
  }

  return engine;
}
