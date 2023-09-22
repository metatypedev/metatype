// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { PrismaRuntime } from "@typegraph/deno/src/providers/prisma.ts";

typegraph("prisma", (g) => {
  const db = new PrismaRuntime("prisma", "POSTGRES");
  const pub = Policy.public();

  const user = t.struct(
    {
      id: t.integer({}, { asId: true }),
      profile: db.link(t.ref("Profile").optional(), "userProfile"),
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
