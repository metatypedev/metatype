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
    auths=[oauth2.github("openid email")],  # out of the box authenfication support
    # skip:start
    rate=TypeGraph.Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
) as g:
    # every field can be controlled by a policy
    public = policies.public()
    meta_only = policies.ctx("email", re.compile(".+@metatype.dev"))
    public_write_only = {"create": public, "none": meta_only}

    # define runtimes where your queries are executed
    github = HTTPRuntime("https://api.github.com")
    db = PrismaRuntime("demo", "POSTGRES_CONN")

    feedback = t.struct(  # a feedback object stored in Postgres
        {
            "id": t.uuid().as_id.config("auto"),
            "email": t.email().add_policy(public_write_only),
            "message": t.string().min(1).max(2000),
        }
    ).named("feedback")

    stargazer = t.struct(  # a stargazer object from Github
        {
            "login": t.string().named("login"),
            "user": github.get(  # link with the feedback across runtimes
                "/users/{user}",
                t.struct(
                    {"user": t.string().from_parent(g("login"))}
                ),  # feed the login value from the parent object
                t.struct({"name": t.string().optional()}),
            ),
        }
    )

    g.expose(  # expose part of the graph for queries
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
