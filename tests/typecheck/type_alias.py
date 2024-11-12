# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.providers import PrismaRuntime
from typegraph.runtimes import RandomRuntime


@typegraph()
def type_alias(g: Graph):
    random = RandomRuntime(seed=1)
    prisma = PrismaRuntime("prisma", "POSTGRES")
    public = Policy.public()

    infos = t.struct(
        {
            "label": t.string(),
            "content": t.string(),
        },
    )

    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
            "info": t.list(infos),
        },
    )

    user = t.struct(
        {
            "id": t.integer().id(),
            "name": t.string(),
            "posts": t.list(g.ref("post")),
        },
        name="user",
    )
    _post = t.struct(
        {
            "id": t.integer().id(),
            "title": t.string(),
            "content": t.string(),
            "author": user,
        },
        name="post",
    )

    g.expose(
        public,
        get_message=random.gen(message),
        create_user=prisma.create(user),
    )
