# skip:start
from typegraph import Policy, t
from typegraph.graph.params import Cors
from typegraph.graph.typegraph import Graph, typegraph
from typegraph.providers.prisma import PrismaRuntime

# skip:end


@typegraph(
    cors=Cors(
        # skip:start
        allow_credentials=False,
        allow_headers=[],
        allow_methods=[],
        expose_headers=[],
        max_age_sec=None,
        # skip:end
        # ..
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
    ),
)
def prisma_runtime(g: Graph):
    public = Policy.public()
    db = PrismaRuntime("legacy", "POSTGRES_CONN")
    user = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "email": t.email(),
            "firstname": t.string(min=2, max=2000),
        },
        name="user",
    )

    g.expose(
        create_user=db.create(user),
        read_user=db.find_many(user),
        find_user=db.query_raw(
            'SELECT id, firstname, email FROM "user" WHERE CAST(id as VARCHAR) = ${id} OR email LIKE ${term} OR firstname LIKE ${term}',
            t.struct(
                {
                    "id": t.string(),
                    "term": t.string(),
                }
            ),
            t.list(user),
        ),
        default_policy=[public],
    )
