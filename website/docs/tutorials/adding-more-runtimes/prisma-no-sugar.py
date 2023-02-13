# skip:start
from typegraph import TypeGraph, effects, t
from typegraph.providers.prisma.runtimes.prisma import PrismaOperationMat, PrismaRuntime

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
        PrismaOperationMat(
            db,
            "Message",
            "createOne",
            effect=effects.create(),
        ),
    )
