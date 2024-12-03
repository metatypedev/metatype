// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";

export const tg = await typegraph("prisma_normal", (g: any) => {
  const db = new PrismaRuntime("prisma", "POSTGRES");
  const pub = Policy.public();

  const user = t.struct(
    {
      id: t.integer({}, { asId: true }),
      profile: db.link(g.ref("Profile").optional(), "userProfile"),
    },
    { name: "User" },
  );

  const profile = t.struct(
    {
      id: t.integer({}, { asId: true }),
      user: db.link("User", "userProfile"),
    },
    { name: "Profile" },
  );

  g.expose({
    createUser: db.create(user).withPolicy(pub),
    updateUser: db.update(user).withPolicy(pub),
    findUniqueProfile: db.findUnique(profile).withPolicy(pub),
    deleteUser: db.delete(user).withPolicy(pub),
  });
});
