# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes import HttpRuntime


# skip:end
@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def backend_for_frontend(g: Graph):
    public = Policy.public()
    github = HttpRuntime("https://api.github.com")

    stargazer = t.struct(
        {
            "login": t.string(name="login"),
            "user": github.get(
                "/users/{user}",
                t.struct({"user": t.string().from_parent("login")}),
                t.struct({"name": t.string().optional()}),
            ),
        }
    )

    g.expose(
        public,
        stargazers=github.get(
            "/repos/metatypedev/metatype/stargazers?per_page=2",
            t.struct({}),
            t.array(stargazer),
        ),
    )
