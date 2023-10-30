from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def union_quantifier(g: Graph):
    metadata = t.struct(
        {
            "label": t.string(),
            "content": t.string(),
            "source": t.string().optional(),
        }
    )

    smartphone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer(),
            "battery": t.integer(),
            "os": t.enum(["Android", "iOS"]),
            "metadatas": t.list(metadata).optional(),
        },
        name="SmartPhone",
    )

    basic_phone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer().optional(),
            "battery": t.integer(),
            "os": t.enum(["Android", "iOS"]).optional(),
            "metadatas": t.list(metadata).optional(),
        },
        name="BasicPhone",
    )

    phone = t.union([basic_phone, smartphone])

    # phone_register_materializer = ModuleMat("ts/union/phone_register.ts")

    public = Policy.public()
    deno = DenoRuntime()
    register_phone = deno.import_(
        t.struct({"phone": phone}),
        t.struct(
            {
                "message": t.string(),
                "type": t.string(),
                "phone": phone,
            }
        ),
        module="ts/union/phone_register.ts",
        name="registerPhone",
    ).with_policy(public)

    g.expose(registerPhone=register_phone)
