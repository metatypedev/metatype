from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes import PythonRuntime

from typegraph import Graph, Policy, t, typegraph


@typegraph()
def quick_start_project(g: Graph):
    # access control
    public = Policy.public()

    # runtimes
    python = PythonRuntime()
    db = PrismaRuntime("database", "POSTGRES")

    # types, database tables
    message = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "title": t.string(),
            "body": t.string(),
        },
        name="message",
    )

    # custom functions
    hello = python.from_lambda(
        t.struct({"world": t.string()}),
        t.string(),
        lambda x: f"Hello {x['world']}!",
    )

    # expose endpoints
    g.expose(
        public,
        hello=hello,
        create_message=db.create(message),
        list_messages=db.find_many(message),
    )
