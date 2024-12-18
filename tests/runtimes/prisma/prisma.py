# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.prisma import PrismaRuntime
from typegraph.effects import CREATE


@typegraph()
def prisma(g: Graph):
    db = PrismaRuntime("prisma", "POSTGRES")

    public = Policy.public()

    record = t.struct(
        {
            "id": t.uuid(config={"auto": True}).id(),
            "name": t.string(),
            "age": t.integer().optional(),
            "createdAt": t.datetime()
            .inject({CREATE: "now"})
            .with_policy(Policy.on(create=public)),
        },
        name="record",
    )

    renamed_record = record.rename("renamed_record")

    messages = t.struct(
        {
            "id": t.integer().id(),
            "time": t.integer(),
            "message": t.string(),
            "sender": db.link("users", "messageSender"),
        },
    ).rename("messages")

    user_identities = t.struct(
        {
            "id": t.uuid(config={"auto": True}).id(),
            "provider": t.enum(["github", "google", "facebook"]),
            "identifier": t.string(),
            "user": g.ref("users"),
        },
        name="user_identity",
    )

    users = t.struct(
        {
            "id": t.integer(config={"auto": True}).id(),
            "identities": t.list(user_identities),
            "email": t.string(),
            "name": t.string(),
            "messages": db.link(t.list(g.ref("messages")), "messageSender"),
        },
        name="users",
    )

    g.expose(
        public,
        findRecord=db.find_unique(record),
        findManyRecords=db.find_many(record),
        createOneRecord=db.create(record),
        createRenamedRecord=db.create(renamed_record),
        deleteOneRecord=db.delete(record),
        updateOneRecord=db.update(record),
        createUser=db.create(users),
        findUniqueUser=db.find_unique(users),
        findMessages=db.find_many(messages),
        updateUser=db.update(users),
        deleteMessages=db.delete_many(messages),
    )
