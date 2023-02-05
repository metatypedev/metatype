# skip:start
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.auth import oauth2
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.http import HTTPRuntime

# skip:end
with TypeGraph(
    "homepage",
    auths=[oauth2.github_auth],
    rate=TypeGraph.Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:

    public = policies.public()
    meta_only = policies.jwt("email", ".+@metatype.dev")
    public_read_only = meta_only  # {effects.create: public, effects.none: meta_only}

    github = HTTPRuntime("https://api.github.com")
    db = PrismaRuntime("demo", "POSTGRES_CONN")

    feedback = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "email": t.email().add_policy(public_read_only),
            "message": t.string().max(2000),
        }
    ).named("feedback")
    db.manage(feedback)  # soon removed

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
        send_feedback=db.insert_one(feedback),
        list_feedback=db.find_many(feedback),
        default_policy=[public],
    )
