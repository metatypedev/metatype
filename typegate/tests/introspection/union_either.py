from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph()
def introspect_union_either(g: Graph):
    rubix_cube = t.struct({"name": t.string(), "size": t.integer()}, name="Rubix")
    toygun = t.struct({"color": t.string()}, name="Toygun")
    gunpla = t.struct(
        {"model": t.string(), "ref": t.union([t.string(), t.integer()])}, name="Gunpla"
    )
    toy = t.either([rubix_cube, toygun, gunpla], name="Toy")

    user = t.struct(
        {
            "name": t.string(name="Username"),
            "favorite": toy,  # .named("FavoriteToy"),
        },
        name="User",
    )

    deno = DenoRuntime()

    g.expose(
        identity=deno.identity(user).with_policy(Policy.public()),
    )
