from typegraph import Policy, t, typegraph, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def array_optional(g: Graph):
    nested = t.struct(
        {
            "a": t.string(),
            "b": t.integer(),
            "c": t.struct({"c1": t.string(), "inner": t.list(t.string().optional())}),
        }
    )

    rec = t.struct(
        {
            "struct_array": t.list(nested.optional()).optional(),
            "string_array": t.list(t.string().optional()).optional(),
            "integer_array": t.list(t.integer().optional()).optional(),
            # TODO:
            # should we support null value for enum/union/either arrays ?
            "enum_array": t.list(t.enum(["A", "B"]).optional()).optional(),
            "union_array": t.list(
                t.union([t.string(), t.integer()]).optional()
            ).optional(),
        }
    )

    rec_not_null = t.struct(
        {
            "struct_array": t.list(t.struct({"x": t.string()})).optional(),
            "string_array": t.list(t.string()).optional(),
            "integer_array": t.list(t.integer()).optional(),
        }
    )

    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        test=deno.identity(rec).with_policy(public),
        testNonNull=deno.identity(rec_not_null).with_policy(public),
    )
