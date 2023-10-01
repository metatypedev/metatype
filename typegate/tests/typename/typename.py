from typegraph_next import Graph, Policy, effects, t, typegraph
from typegraph_next.providers.prisma import PrismaRuntime
from typegraph_next.runtimes.deno import DenoRuntime
from typegraph_next.runtimes.random import RandomRuntime


@typegraph()
def typename_test(g: Graph):
    public = Policy.public()
    user = t.struct({"id": t.integer()}, name="user")
    prisma_user = t.struct({"id": t.integer(as_id=True)}, name="userprisma")

    deno = DenoRuntime()
    prisma = PrismaRuntime("prisma", "POSTGRES")

    random = RandomRuntime(seed=1)
    randomUser = random.gen(t.ref("user")).with_policy(public)

    deno_user = deno.func(
        t.struct(),
        user,
        code="() => ({ id: 12 })",
    ).with_policy(public)

    g.expose(
        denoUser=deno_user,
        randomUser=randomUser,
        dropSchema=prisma.raw_execute(
            "DROP SCHEMA IF EXISTS typename CASCADE",
            t.struct({}),
            effect=effects.delete(),
        ).with_policy(public),
        createUser=prisma.create(prisma_user).with_policy(public),
    )
