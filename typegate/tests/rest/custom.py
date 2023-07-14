from typegraph_next import g, t, typegraph
from typegraph_next.runtimes.deno import DenoRuntime

with typegraph(
    name="custom",
    dynamic=False,
    folder="custom_dir",
) as expose:
    deno = DenoRuntime()
    pub = g.Policy.public()

    ping = deno.func(
        t.struct({}),
        t.integer(),
        code="() => 1",
    ).with_policy(pub)

    expose(
        ping=ping,
    )
