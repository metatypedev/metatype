from os import environ

from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.materializers.random import RandomMat
from typegraph.materializers.random import RandomRuntime
from typegraph.types import types as t

postgres = environ.get(
    "TEST_POSTGRES_DB", "postgresql://postgres:password@localhost:5432/db?schema=test"
)

with TypeGraph("typename") as g:

    allow_all = policies.allow_all()
    userModel = t.struct({"id": t.integer()}).named("user")
    userModelPrisma = t.struct({"id": t.integer().config("id")}).named("userprisma")

    prismaRuntimePosgres = PrismaRuntime("prisma", postgres)
    prismaRuntimePosgres.manage(userModelPrisma)

    randomRuntimeSeeded = RandomRuntime(seed=1)
    randomUser = t.gen(g("user"), RandomMat(runtime=randomRuntimeSeeded)).add_policy(
        allow_all
    )

    denoUser = t.func(
        t.struct(),
        userModel,
        FunMat("() => ({ id: 12 })"),
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
