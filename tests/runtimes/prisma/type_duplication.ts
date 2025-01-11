// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";

export const tg = await typegraph("type-duplication", (g: any) => {
  const prisma = new PrismaRuntime("prisma", "POSTGRES");
  const noOfTypes = Number(Deno.env.get("TYPE_COUNT") ?? 5);
  if (Number.isNaN(noOfTypes)) {
    throw new Error("NAN!");
  }
  const enttNames = [...Array(noOfTypes).keys()].map((ii) => `entt${ii}`);
  const entts = Object.fromEntries(enttNames.map(
    (name, ii) => {
      const fields = {
        id: t.uuid().id(),
      } as Record<string, t.Typedef>;
      let jj = -1;
      for (const ref of enttNames) {
        jj += 1;

        // skip self on self
        if (ii == jj) continue;

        // both are even or both are odd
        // evens have single optional evens
        // odds have single optional odds
        if (ii % 2 == jj % 2) {
          fields[`field_${ref}`] = ii < jj
            ? t.optional(g.ref(ref))
            // latter numbers should have the fkey
            : prisma.link(
              t.optional(g.ref(ref)),
              `link_${ii}_to_${jj}`,
              { fkey: true },
            );
        } //
        // ref is odd
        // evens have multiple odds
        else if (ii % 2 == 0 && jj % 2 != 0) {
          fields[`field_${ref}`] = t.list(g.ref(ref));
        } //
        // odds have a single even
        // self is odd
        else {
          fields[`field_${ref}`] = g.ref(ref);
        }
      }
      return [
        name,
        t.struct(fields),
      ];
    },
  )) as Record<string, t.Typedef>;
  const rootFns = {} as Record<string, t.Func>;
  for (const [key, type] of Object.entries(entts)) {
    entts[key] = (type as t.Typedef).rename(key);
  }
  for (const [key, type] of Object.entries(entts)) {
    rootFns[`find_${key}`] = prisma.findFirst(type);
    rootFns[`find_unique_${key}`] = prisma.findUnique(type);
    rootFns[`find_many_${key}`] = prisma.findMany(type);
    rootFns[`create_${key}`] = prisma.create(type);
    rootFns[`create_many_${key}`] = prisma.createMany(type);
    rootFns[`update_${key}`] = prisma.update(type);
    rootFns[`update_many_${key}`] = prisma.updateMany(type);
    rootFns[`delete_${key}`] = prisma.delete(type);
    rootFns[`delete_many_${key}`] = prisma.deleteMany(type);
    rootFns[`upsert_${key}`] = prisma.upsert(type);
    rootFns[`aggregate_${key}`] = prisma.aggregate(type);
    rootFns[`group_by_${key}`] = prisma.groupBy(type);
  }
  g.expose(
    {
      ...rootFns,
    },
    Policy.public(),
  );
});
