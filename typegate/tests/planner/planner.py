from typegraph import TypeGraph, t
from typegraph.runtimes.deno import PureFunMat
from typegraph import policies as p

with TypeGraph("test") as g:
    A = t.struct({"a": t.integer()}).named("A")
    B = t.struct(
        {
            "b": t.either(
                [
                    t.struct({"c": t.integer()}).named("C1"),
                    t.struct({"c": t.string()}).named("C2"),
                ]
            )
        }
    ).named("B")

    def gen_union1():
        return t.union([t.integer(), t.string()])

    def gen_union2():
        return t.union([A, B])

    dummy_mat = PureFunMat("() => ({})")

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
            "from_union1": t.func(
                t.struct({"u1": gen_union1().from_parent("Union1")}),
                t.integer(),
                dummy_mat,
            ),
            "from_union2": t.func(
                t.struct({"u2": gen_union2().from_parent("Union2")}),
                t.integer(),
                dummy_mat,
            ),
            "union1": gen_union1().named("Union1"),
            "union2": gen_union2().named("Union2"),
        }
    )

    registered_user = t.struct(
        {
            "id": t.uuid().as_id,
            "email": t.email().named("RegisteredUserEmail"),
            "profile": t.func(
                t.struct({"email": t.email().from_parent("RegisteredUserEmail")}),
                t.struct(
                    {
                        "email": t.email(),
                        "displayName": t.string(),
                        "profilePic": t.string(),
                    }
                ),
                dummy_mat,
            ),
        },
    ).named("RegisteredUser")

    guest_user = t.struct(
        {
            "id": t.uuid().as_id,
        }
    ).named("GuestUser")

    public = p.public()

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
        three=t.func(
            t.struct(),
            t.struct(
                {
                    "id": t.integer().as_id,
                    "user": t.either([registered_user, guest_user]),
                }
            ),
            dummy_mat,
        ),
        default_policy=[public],
    )
