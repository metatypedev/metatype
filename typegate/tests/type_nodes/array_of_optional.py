from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("array_optional") as g:
    rec = t.struct(
        {
            "struct_array": t.array(t.struct({"_": t.string()}).optional()).optional(),
            "string_array": t.array(t.string().optional()).optional(),
            "integer_array": t.array(t.integer().optional()).optional(),
            "enum_array": t.array(t.enum(["A", "B"]).optional()).optional(),
            "union_array": t.array(
                t.union([t.string(), t.integer()]).optional()
            ).optional(),
        }
    )

    public = policies.public()
    g.expose(
        test=t.func(
            rec.named("Input"),
            rec.named("Output"),
            PredefinedFunMat("identity"),
        ).add_policy(public)
    )
