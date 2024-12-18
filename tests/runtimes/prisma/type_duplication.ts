// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";

export const tg = await typegraph("type-duplication", (g: any) => {
  const prisma = new PrismaRuntime("prisma", "POSTGRES");
  const entts = {
    vivaSession: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      sourceLink: g.ref("scenarioLink"),
      // response: g.ref("response").optional(),
    }),
    scenario: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      scenes: t.list(g.ref("scene")),
      links: t.list(g.ref("scenarioLink")),
    }),
    scenarioLink: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      scenario: g.ref("scenario"),
      sessions: t.list(g.ref("vivaSession")),
    }),
    scene: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      scenario: g.ref("scenario"),
      video: g.ref("sceneVideo").optional(),
      responseVideos: t.list(g.ref("responseVideo")),
    }),
    sceneVideo: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      scene: g.ref("scene"),
    }),
    response: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      // session: g.ref("vivaSession"),
      videos: t.list(g.ref("responseVideo")),
    }),
    responseVideo: t.struct({
      id: t.uuid({ config: ["auto"] }).id(),
      response: g.ref("response"),
      scene: g.ref("scene"),
    }),
  } as Record<string, t.Typedef>;
  const rootFns = {} as Record<string, t.Func>;
  for (const [key, type] of Object.entries(entts)) {
    entts[key] = (type as t.Typedef).rename(key);
  }
  for (const [key, type] of Object.entries(entts)) {
    rootFns[`find_${key}`] = prisma.findFirst(type);
    rootFns[`create_${key}`] = prisma.create(type);
    rootFns[`update_${key}`] = prisma.update(type);
    rootFns[`delte_${key}`] = prisma.delete(type);
  }
  g.expose(
    {
      ...rootFns,
    },
    Policy.public(),
  );
});
