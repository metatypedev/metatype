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
        }
    )

    public = p.public()

    g.expose(
        one=t.func(
            t.struct({}),
            record,
            PureFunMat("() => ({})"),
        ).add_policy(public),
    )
