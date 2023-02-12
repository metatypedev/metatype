# skip:start
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime

# skip:end
with TypeGraph(
    "backend-for-frontend",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()
    github = HTTPRuntime("https://api.github.com")

    stargazer = t.struct(
        {
            "login": t.string().named("login"),
            "user": github.get(
                "/users/{user}",
                t.struct({"user": t.string().from_parent(g("login"))}),
                t.struct({"name": t.string().optional()}),
            ),
        }
    )

    g.expose(
        stargazers=github.get(
            "/repos/metatypedev/metatype/stargazers?per_page=2",
            t.struct({}),
            t.array(stargazer),
        ),
        default_policy=[public],
    )
