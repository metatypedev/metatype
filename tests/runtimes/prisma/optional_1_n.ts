// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";

export const tg = await typegraph("prisma_opt_1", (g: any) => {
  const db = new PrismaRuntime("prisma", "POSTGRES");
  const pub = Policy.public();

  const record = t.struct(
    {
      id: t.uuid({ asId: true, config: { auto: true } }),
      name: t.string(),
      age: t.integer().optional(),
    },
    { name: "record" },
  );

  const messages = t.struct(
    {
      id: t.integer({}, { asId: true }),
      time: t.integer(),
      message: t.string(),
      sender: db.link(g.ref("users").optional(), "messageSender"),
    },
    { name: "messages" },
  );

  const users = t.struct(
    {
      id: t.integer({}, { asId: true, config: { auto: true } }),
      email: t.string(),
      name: t.string(),
      messages: db.link(t.list(g.ref("messages")), "messageSender"),
    },
    { name: "users" },
  );

  g.expose({
    findManyRecords: db.findMany(record).withPolicy(pub),
    createOneRecord: db.create(record).withPolicy(pub),
    deleteOneRecord: db.delete(record).withPolicy(pub),
    updateOneRecord: db.update(record).withPolicy(pub),
    createUser: db.create(users).withPolicy(pub),
    findUniqueUser: db.findUnique(users).withPolicy(pub),
    findMessages: db.findMany(messages).withPolicy(pub),
    updateUser: db.update(users).withPolicy(pub),
    deleteMessages: db.deleteMany(messages).withPolicy(pub),
  });
});
