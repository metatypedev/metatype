from typegraph import typegraph, t, Graph, Policy
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def test(g: Graph):
    A = t.struct({"a": t.integer()}, name="A")
    B = t.struct(
        {
            "b": t.either(
                [
                    t.struct({"c": t.integer()}, name="C1"),
                    t.struct({"c": t.string()}, name="C2"),
                ]
            )
        },
        name="B",
    )

    union1 = t.union([t.integer(), t.string()])
    union2 = t.union([A, B])

    deno = DenoRuntime()
    dummy_func = "() => {}"

    record = t.struct(
        {
            "id": t.uuid(),
            "email": t.email(),
            "nested": t.struct(
                {
                    "first": t.string(),
                    "second": t.list(t.float()),
                    "third": t.boolean().optional(),
                }
            ),
            "union1": union1.rename("Union1"),
            "union2": union2.rename("Union2"),
            "from_union1": deno.func(
                t.struct({"u1": union1.from_parent("Union1")}),
                t.integer(),
                code=dummy_func,
            ),
            "from_union2": deno.func(
                t.struct({"u2": union2.from_parent("Union2")}),
                t.integer(),
                code=dummy_func,
            ),
        }
    )

    registered_user = t.struct(
        {
            "id": t.uuid(as_id=True),
            "email": t.email(name="RegisteredUserEmail"),
            "profile": deno.func(
                t.struct({"email": t.email().from_parent("RegisteredUserEmail")}),
                t.struct(
                    {
                        "email": t.email(),
                        "displayName": t.string(),
                        "profilePic": t.string(),
                    }
                ),
                code=dummy_func,
            ),
        },
        name="RegisteredUser",
    )

    guest_user = t.struct(
        {
            "id": t.uuid(as_id=True),
        },
        name="GuestUser",
    )

    public = Policy.public()

    g.expose(
        public,
        one=deno.func(
            t.struct({}),
            record,
            code=dummy_func,
        ),
        two=deno.func(
            t.struct({}),
            t.struct(
                {
                    "id": t.integer(),
                    "email": t.email(name="UserEmail"),
                    "profile": deno.func(
                        t.struct({"email": t.email().from_parent("UserEmail")}),
                        t.struct(
                            {
                                "email": t.email(),
                                "firstName": t.string(),
                                "lastName": t.string(),
                                "profilePic": t.string(),
                            }
                        ),
                        code=dummy_func,
                    ).rename("UserProfile"),
                    "taggedPic": deno.func(
                        t.struct(
                            {
                                "profile": t.struct(
                                    {"email": t.email(), "profilePic": t.string()}
                                ).from_parent("UserProfile")
                            }
                        ),
                        t.string(),
                        code=dummy_func,
                    ),
                }
            ),
            code=dummy_func,
        ),
        three=deno.func(
            t.struct({}),
            t.struct(
                {
                    "id": t.integer(as_id=True),
                    "user": t.either([registered_user, guest_user]),
                }
            ),
            code=dummy_func,
        ),
    )
