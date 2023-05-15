from typegraph import TypeGraph, policies, t
from typegraph.graph.auth import oauth2
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.deno import PureFunMat
from typegraph.runtimes.http import HTTPRuntime
from typegraph.runtimes.python import Python

with TypeGraph(
    "public-api",
    auths=[oauth2.github("openid profile email")],
    rate=TypeGraph.Rate(window_limit=2000, window_sec=60, query_limit=200),
) as g:
    # 1 what / types

    t.string()
    sum_result = t.integer()

    # 2 how / materializers

    add = t.func(
        t.struct({"a": t.integer(), "b": t.integer()}),
        sum_result,
        PureFunMat("({ a, b }) => a + b"),
    )

    # 3 where / runtimes

    python = Python()

    # 4 who / policies

    public = policies.public()

    g.expose(
        add=add,
        default_policy=public,
    )

    # more complex example with logging required

    db = PrismaRuntime("demo", "POSTGRES")
    github = HTTPRuntime("https://api.github.com")

    # http://localhost:7890/public-api/auth/github
    github_only = policies.jwt("provider", "github")

    user = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "user": t.string().named("login"),
            "github": github.get(
                "/users/{user}",
                t.struct({"user": t.string().from_parent(g("login"))}),
                t.struct({"name": t.string().optional()}),
            ),
        }
    ).named("user")

    g.expose(
        insert_user=db.create(user),
        users=db.find_many(user),
        default_policy=[github_only],
    )
