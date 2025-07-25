# skip:start
import re

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Auth, Cors, Rate
from typegraph.providers import PrismaRuntime
from typegraph.runtimes import HttpRuntime


# skip:end
@typegraph(
    # skip:start
    rate=Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def homepage(g: Graph):
    # every field may be controlled by a policy
    public = Policy.public()
    meta_only = Policy.context("email", re.compile(".+@metatype.dev"))
    public_write_only = Policy.on(create=public, read=meta_only)

    # define runtimes where your queries are executed
    github = HttpRuntime("https://api.github.com")
    db = PrismaRuntime("demo", "POSTGRES_CONN")

    # a feedback object stored in Postgres
    feedback = t.struct(
        {
            "id": t.uuid(as_id=True, config=["auto"]),
            "email": t.email().with_policy(public_write_only),
            "message": t.string(min=1, max=2000),
        },
        name="feedback",
    )

    # a stargazer object from Github
    stargazer = t.struct(
        {
            "login": t.string(),
            # link with the feedback across runtimes
            "user": github.get(
                "/users/{user}",
                t.struct({"user": t.string().from_parent("login")}),
                t.struct({"name": t.string().optional()}),
            ),
        }
    )

    # out of the box authenfication support
    g.auth(
        Auth.oauth2(
            provider="github",
            scopes=["openid", "email"],
            clients=[
                {
                    "id_secret": "APP_CLIENT_ID",
                    "redirect_uri_secret": "APP_REDIRECT_URI",
                }
            ],
        )
    )

    # expose part of the graph for queries
    g.expose(
        public,
        stargazers=github.get(
            "/repos/metatypedev/metatype/stargazers?per_page=2",
            t.struct({}),
            t.list(stargazer),
        ),
        # automatically generate crud operations
        send_feedback=db.create(feedback),
        list_feedback=db.find_many(feedback),
    )
