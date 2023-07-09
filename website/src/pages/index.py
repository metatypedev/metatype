# skip:start
import re

from typegraph import TypeGraph, policies, t
from typegraph.graph.auth import oauth2
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.http import HTTPRuntime

# skip:end
with TypeGraph(
    # skip:next-line
    "homepage",
    # out of the box authenfication support
    auths=[oauth2.github("openid email")],
    # skip:start
    rate=TypeGraph.Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
) as g:
    # every field may be controlled by a policy
    public = policies.public()
    meta_only = policies.ctx("email", re.compile(".+@metatype.dev"))
    public_write_only = {"create": public, "none": meta_only}

    # define runtimes where your queries are executed
    github = HTTPRuntime("https://api.github.com")
    db = PrismaRuntime("demo", "POSTGRES_CONN")

    # a feedback object stored in Postgres
    feedback = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "email": t.email().add_policy(public_write_only),
            "message": t.string().min(1).max(2000),
        }
    ).named("feedback")

    # a stargazer object from Github
    stargazer = t.struct(
        {
            "login": t.string().named("login"),
            # link with the feedback across runtimes
            "user": github.get(
                "/users/{user}",
                t.struct({"user": t.string().from_parent(g("login"))}),
                t.struct({"name": t.string().optional()}),
            ),
        }
    )

    # expose part of the graph for queries
    g.expose(
        stargazers=github.get(
            "/repos/metatypedev/metatype/stargazers?per_page=2",
            t.struct({}),
            t.array(stargazer),
        ),
        # automatically generate crud operations
        send_feedback=db.create(feedback),
        list_feedback=db.find_many(feedback),
        default_policy=[public],
    )
