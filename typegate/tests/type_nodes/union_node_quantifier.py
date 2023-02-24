from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("either") as g:
    # user models
    smartphone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer(),
            "battery": t.integer(),
            "os": t.enum(["Android", "iOS"]),
        }
    ).named("Smartphone")
    basic_phone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer().optional(),
            "battery": t.integer(),
        }
    ).named("BasicPhone")

    phone_register_materializer = ModuleMat("ts/union/phone_register.ts")

    public = policies.public()
    register_phone = t.func(
        t.struct({"phone": t.union([basic_phone, smartphone])}),
        t.struct({"message": t.string()}),
        phone_register_materializer.imp("registerPhone"),
    ).add_policy(public)

    g.expose(registerPhone=register_phone)
