from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes import RandomRuntime
from typegraph.providers import PrismaRuntime


@typegraph()
def type_alias(g: Graph):
    random = RandomRuntime(seed=1)
    prisma = PrismaRuntime("prisma", "POSTGRES")
    public = Policy.public()

    infos = t.struct(
        {
            "label": t.string(),
            "content": t.string(),
        }
    )

    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
            "info": t.list(infos),
        }
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
