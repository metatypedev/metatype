# skip:start
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaInsertMat
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma-no-sugar") as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    message = t.struct({})
    # skip:end
    t.func(
        t.struct(
            {
                "data": t.struct(
                    {
                        # notice to absence of `id` as automatically generated
                        "title": t.string(),
                        "body": t.string(),
                    }
                )
            }
        ),
        t.array(message),
        PrismaInsertMat(db),
    )
