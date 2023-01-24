from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.deno import FunMat
from typegraph.runtimes.random import RandomMat
from typegraph.runtimes.random import RandomRuntime

with TypeGraph("prisma") as g:

    public = policies.public()
    userModel = t.struct({"id": t.integer()}).named("user")
    userModelPrisma = t.struct({"id": t.integer().config("id")}).named("userprisma")

    prismaRuntimePosgres = PrismaRuntime("prisma", "POSTGRES")
    prismaRuntimePosgres.manage(userModelPrisma)

    randomRuntimeSeeded = RandomRuntime(seed=1)
    randomUser = t.gen(g("user"), RandomMat(runtime=randomRuntimeSeeded)).add_policy(
        public
    )

    denoUser = t.func(
        t.struct(),
        userModel,
        FunMat("() => ({ id: 12 })"),
    ).add_policy(public)

    g.expose(
        denoUser=denoUser,
        randomUser=randomUser,
        **prismaRuntimePosgres.gen(
            {
                "createUser": (userModelPrisma, "create", public),
                "executeRaw": (t.struct(), "executeRaw", public),
            }
        )
    )
