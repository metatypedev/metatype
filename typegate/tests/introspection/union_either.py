from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("introspect-union-either") as g:
    rubix_cube = t.struct({"name": t.string(), "size": t.integer()}).named("Rubix")
    toygun = t.struct({"color": t.string()}).named("Toygun")
    gunpla = t.struct(
        {"model": t.string(), "ref": t.union([t.string(), t.integer()])}
    ).named("Gunpla")
    toy = t.either([rubix_cube, toygun, gunpla, t.string()])

    user = t.struct(
        {
            "name": t.string().named("Username"),
            "favorite": toy.named("FavoriteToy"),
        }
    ).named("User")

    g.expose(
        identity=t.func(
            user.named("UserInput"),
            user.named("UserOutput"),
            PredefinedFunMat("identity"),
        )
        .named("f")
        .add_policy(policies.public())
    )
