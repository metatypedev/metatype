from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("array_optional") as g:
    nested = t.struct(
        {
            "a": t.string(),
            "b": t.integer(),
            "c": t.struct({"c1": t.string(), "inner": t.array(t.string().optional())}),
        }
    )

    rec = t.struct(
        {
            "struct_array": t.array(nested.optional()).optional(),
            "string_array": t.array(t.string().optional()).optional(),
            "integer_array": t.array(t.integer().optional()).optional(),
            # TODO:
            # should we support null value for enum/union/either arrays ?
            "enum_array": t.array(t.enum(["A", "B"]).optional()).optional(),
            "union_array": t.array(
                t.union([t.string(), t.integer()]).optional()
            ).optional(),
        }
    )

    rec_not_null = t.struct(
        {
            "struct_array": t.array(t.struct({"x": t.string()})).optional(),
            "string_array": t.array(t.string()).optional(),
            "integer_array": t.array(t.integer()).optional(),
        }
    )

    public = policies.public()
    g.expose(
        test=t.func(
            rec.named("Input1"),
            rec.named("Output1"),
            PredefinedFunMat("identity"),
        ).add_policy(public),
        testNonNull=t.func(
            rec_not_null.named("Input2"),
            rec_not_null.named("Output2"),
            PredefinedFunMat("identity"),
        ).add_policy(public),
    )
