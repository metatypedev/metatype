from typegraph import Graph, Policy, effects, t, typegraph
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.random import RandomRuntime


@typegraph()
def typename(g: Graph):
    public = Policy.public()
    user = t.struct({"id": t.integer()}, name="user")
    prisma_user = t.struct({"id": t.integer(as_id=True)}, name="userprisma")

    deno = DenoRuntime()
    prisma = PrismaRuntime("prisma", "POSTGRES")

    random = RandomRuntime(seed=1)
    randomUser = random.gen(g.ref("user")).with_policy(public)

    deno_user = deno.func(
        t.struct(),
        user,
        code="() => ({ id: 12 })",
    ).with_policy(public)

    u8 = t.integer(min=0, max=255, name="U8")

    color = t.either(
        [
            t.enum(["red", "green", "blue"]).rename("NamedColor"),
            t.string(pattern=r"^#[0-9a-f]{6}$").rename("HexColor"),
            t.struct({"r": u8, "g": u8, "b": u8}).rename("RgbColor"),
        ]
    )

    g.expose(
        denoUser=deno_user,
        randomUser=randomUser,
        dropSchema=prisma.execute(
            "DROP SCHEMA IF EXISTS typename CASCADE",
            t.struct({}),
            effect=effects.delete(),
        ).with_policy(public),
        createUser=prisma.create(prisma_user).with_policy(public),
        getRgbColor=deno.identity(t.struct({"color": color}))
        .apply(
            {
                "color": g.set(
                    {
                        "r": 255,
                        "g": 0,
                        "b": 0,
                    }
                )
            }
        )
        .with_policy(public),
    )
