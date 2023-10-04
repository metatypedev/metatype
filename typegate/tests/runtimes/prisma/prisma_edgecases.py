from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.prisma import PrismaRuntime


@typegraph()
def prisma(g: Graph):
    # schema ref:
    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

    db = PrismaRuntime("prisma", "POSTGRES")
    public = Policy.public()

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "pseudo": t.string(config={"unique": True}),
            "email": t.email(),
            # Note:
            # * schema validation fails when min(.>=1).max(20) (2023/04/17)
            # * now it seems to work. ajv issues ? (2023/04/18)
            "firstname": t.string(min=2, max=20),
        },
        name="User",
    )

    g.expose(
        public,
        findManyUsers=db.find_many(user),
        findUniqueUser=db.find_unique(user),
        createOneUser=db.create(user),
    )
