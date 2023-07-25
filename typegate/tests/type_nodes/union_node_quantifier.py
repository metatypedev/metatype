from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union_quantifier") as g:
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
            "metadatas": t.array(metadata).optional(),
        }
    ).named("SmartPhone")

    basic_phone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer().optional(),
            "battery": t.integer(),
            "os": t.enum(["Android", "iOS"]).optional(),
            "metadatas": t.array(metadata).optional(),
        }
    ).named("BasicPhone")

    phone = t.union([basic_phone, smartphone])

    phone_register_materializer = ModuleMat("ts/union/phone_register.ts")

    public = policies.public()
    register_phone = t.func(
        t.struct({"phone": phone}),
        t.struct(
            {
                "message": t.string(),
                "type": t.string(),
                "phone": phone,
            }
        ),
        phone_register_materializer.imp("registerPhone"),
    ).add_policy(public)

    g.expose(registerPhone=register_phone)
