from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph(name="circular") as g:
    stars = t.struct({"count": t.integer()})
    medals = t.struct({"title": t.string(), "count": t.integer()})

    user = t.struct(
        {
            "name": t.string(),
            # Edgecase #1: optional that holds a self-reference
            "professor": g("User").optional(),
            # Edgecase #2: array that holds a self-reference
            "parents": t.array(g("User")),
            # Edgecase #3: optional array that holds a self-reference
            "friends": t.array(g("User")).optional(),
            # Edgecase #4: optional object that holds a self-reference
            "paper": t.struct({"title": t.string(), "author": g("User")})
            .named("Paper")
            .optional(),
            # Edgecase #5: optional nested object with multipple references
            "root": t.struct(
                {
                    "some_field": t.string(),
                    "depth_one": g("User").optional(),
                    "depth_one_2": g("User"),
                    "depth_two": t.struct({"depth_three": g("User")}).named("Infos"),
                }
            )
            .named("Speciality")
            .optional(),
            # Edgecase #6: nested union/either
            "award": t.either(
                [
                    t.string(),
                    t.integer(),
                    t.union([medals, stars]),
                ]
            ).optional(),
        }
    ).named("User")

    public = policies.public()

    register_user = t.func(
        t.struct({"user": user}).named("Input"),
        t.struct(
            {
                "message": t.string(),
                "user": user,
            }
        ).named("Output"),
        ModuleMat("ts/circular.ts").imp("registerUser"),
    ).add_policy(public)

    g.expose(registerUser=register_user)
