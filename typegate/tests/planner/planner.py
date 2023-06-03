from typegraph import TypeGraph, t
from typegraph.runtimes.deno import PureFunMat
from typegraph import policies as p

with TypeGraph("test") as g:
    record = t.struct(
        {
            "id": t.uuid(),
            "email": t.email(),
            "nested": t.struct(
                {
                    "first": t.string(),
                    "second": t.array(t.float()),
                    "third": t.boolean().optional(),
                }
            ),
            "union1": t.union([t.integer(), t.string()]),
            "union2": t.union(
                [
                    t.struct({"a": t.integer()}).named("A"),
                    t.struct(
                        {
                            "b": t.either(
                                [
                                    t.struct({"c": t.integer()}).named("C1"),
                                    t.struct({"c": t.string()}).named("C2"),
                                ]
                            )
                        }
                    ).named("B"),
                ]
            ),
        }
    )

    public = p.public()

    dummy_mat = PureFunMat("() => ({})")

    g.expose(
        one=t.func(
            t.struct({}),
            record,
            dummy_mat,
        ),
        two=t.func(
            t.struct(),
            t.struct(
                {
                    "id": t.integer(),
                    "email": t.email().named("UserEmail"),
                    "profile": t.func(
                        t.struct({"email": t.email().from_parent("UserEmail")}),
                        t.struct(
                            {
                                "email": t.email(),
                                "firstName": t.string(),
                                "lastName": t.string(),
                                "profilePic": t.string(),
                            }
                        ),
                        dummy_mat,
                    ).named("UserProfile"),
                    "taggedPic": t.func(
                        t.struct(
                            {
                                "profile": t.struct(
                                    {"email": t.email(), "profilePic": t.string()}
                                ).from_parent("UserProfile")
                            }
                        ),
                        t.string(),
                        dummy_mat,
                    ),
                }
            ),
            dummy_mat,
        ),
        default_policy=[public],
    )
