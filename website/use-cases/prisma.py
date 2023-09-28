# skip:start
from typegraph_next import Policy, t
from typegraph_next.graph.params import Cors
from typegraph_next.graph.typegraph import Graph, typegraph
from typegraph_next.providers.prisma import PrismaRuntime

# skip:end


@typegraph(
    cors=Cors(
        allow_credentials=False,
        allow_headers=[],
        allow_methods=[],
        expose_headers=[],
        max_age_sec=None,
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
            """
                SELECT id, firstname, email FROM "user"
                WHERE CAST(id as VARCHAR) = ${id} OR email LIKE ${term} OR firstname LIKE ${term}
            """,
            t.struct(
                {
                    "id": t.string(),
                    "term": t.string(),
                }
            ),
            t.array(
                t.struct(
                    {
                        "id": db.as_column(t.uuid()),
                        "firstname": db.as_column(t.string()),
                        "email": db.as_column(t.string()),
                    }
                )
            ),
        ),
        default_policy=[public],
    )
