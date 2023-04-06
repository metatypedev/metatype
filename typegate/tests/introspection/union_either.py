from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("introspect-union-either") as g:
    rubix_cube = t.struct({"name": t.string(), "size": t.integer()}).named("Rubix")
    toygun = t.struct({"color": t.string()}).named("Toygun")
    gunpla = t.struct(
        {"model": t.string(), "ref": t.union([t.string(), t.integer()])}
    ).named("Gunpla")
    toy = t.either([rubix_cube, toygun, gunpla])

    user = t.struct(
        {
            "name": t.string().named("Username"),
            "favorite": toy.named("FavoriteToy"),
        }
    ).named("User")

    g.expose(
        identity=t.func(
            user.named("UserInput1"),
            user.named("UserOutput1"),
            PredefinedFunMat("identity"),
        )
        .named("f1")
        .add_policy(policies.public()),
        identityDiff=t.func(
            t.struct(
                {
                    "name": t.string().named("Username2"),
                    "favorite": toy.named("FavoriteToy2"),
                }
            ).named("UserInput2"),
            t.struct(
                {
                    "name": t.string().named("Username3"),
                    "favorite": toy.named("FavoriteToy3"),
                }
            ).named("UserOutput2"),
            PredefinedFunMat("identity"),
        )
        .named("f2")
        .add_policy(policies.public()),
    )
