from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Auth, Rate
from typegraph.providers import PrismaRuntime
from typegraph.runtimes import DenoRuntime, HttpRuntime, PythonRuntime


@typegraph(
    rate=Rate(window_limit=2000, window_sec=60, query_limit=200),
)
def public_api(g: Graph):
    g.auth(Auth.oauth2_github("openid profile email"))

    deno = DenoRuntime()

    # 1 what / types

    t.string()
    sum_result = t.integer()

    # 2 how / materializers

    add = deno.func(
        t.struct({"a": t.integer(), "b": t.integer()}),
        sum_result,
        code="({ a, b }) => a + b",
    )

    # 3 where / runtimes

    _python = PythonRuntime()

    # 4 who / policies

    public = Policy.public()

    g.expose(
        public,
        add=add,
    )

    # more complex example with logging required

    db = PrismaRuntime("demo", "POSTGRES")
    github = HttpRuntime("https://api.github.com")

    # http://localhost:7890/public-api/auth/github
    github_only = Policy.context("provider", "github")

    user = t.struct(
        {
            "id": t.uuid(as_id=True, config=["auto"]),
            "user": t.string(name="login"),
            "github": github.get(
                "/users/{user}",
                t.struct({"user": t.string().from_parent("login")}),
                t.struct({"name": t.string().optional()}),
            ),
        },
        name="User",
    )

    g.expose(
        github_only,
        insert_user=db.create(user),
        users=db.find_many(user),
    )
