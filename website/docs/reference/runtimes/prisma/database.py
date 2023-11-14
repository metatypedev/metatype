# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors

# isort: off
# skip:end
# highlight-next-line
from typegraph.providers.prisma import PrismaRuntime


@typegraph(
    # skip:next-line
    cors=Cors(
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
    ),
)
def database(g: Graph):
    db = PrismaRuntime("database", "POSTGRES_CONN")
    public = Policy.public()

    message = t.struct(
        {
            # highlight-next-line
            "id": t.integer(as_id=True, config=["auto"]),
            "title": t.string(),
            "body": t.string(),
        },
        # highlight-next-line
        name="message",
    )

    g.expose(
        public,
        # highlight-next-line
        create_message=db.create(message),
        list_messages=db.find_many(message),
    )
