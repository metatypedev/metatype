// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/mod.ts";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.ts";

typegraph("prisma_normal", (g) => {
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
