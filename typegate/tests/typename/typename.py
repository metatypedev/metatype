from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.deno import FunMat
from typegraph.runtimes.random import RandomMat
from typegraph.runtimes.random import RandomRuntime

with TypeGraph("prisma") as g:

    allow_all = policies.allow_all()
    userModel = t.struct({"id": t.integer()}).named("user")
    userModelPrisma = t.struct({"id": t.integer().config("id")}).named("userprisma")

    prismaRuntimePosgres = PrismaRuntime("prisma", "POSTGRES")
    prismaRuntimePosgres.manage(userModelPrisma)

    randomRuntimeSeeded = RandomRuntime(seed=1)
    randomUser = t.gen(g("user"), RandomMat(runtime=randomRuntimeSeeded)).add_policy(
        allow_all
    )

    denoUser = t.func(
        t.struct(),
        userModel,
        FunMat("() => ({ id: 12 })", effect=None, idempotent=True),
    ).add_policy(allow_all)

    g.expose(
        denoUser=denoUser,
        randomUser=randomUser,
        **prismaRuntimePosgres.gen(
            {
                "createUser": (userModelPrisma, "create", allow_all),
                "executeRaw": (t.struct(), "executeRaw", allow_all),
            }
        )
    )
