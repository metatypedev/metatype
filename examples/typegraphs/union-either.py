# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime


# skip:end
@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def union_either(g: Graph):
    deno = DenoRuntime()
    members = [
        t.string().rename("scalar_1"),
        t.integer().rename("scalar_2"),
        t.struct(
            {
                "field1": t.string(),
            }
        ).rename("comp_1"),
        t.struct(
            {
                "field2": t.string(),
            }
        ).rename("comp_2"),
        t.list(t.string()).rename("scalar_list"),
        # # FIXME: list of composites is broken
        # t.list(
        #     t.struct(
        #         {
        #             "listField": t.string(),
        #         }
        #     ),
        # ),
    ]
    g.expose(
        Policy.public(),
        outer=deno.func(
            t.struct(),
            t.struct(
                {
                    "union": t.union(members),
                    "either": t.either(members),
                    "unionList": t.list(t.union(members)),
                }
            ),
            code="""() => ({
                either: {
                    field1: "1",
                },
                union: {
                    field2: "2",
                },
                unionList: [
                    "scalar",
                    2,
                    {
                        field1: "1",
                    },
                    {
                        field2: "2",
                    },
                    ["scalar_1", "scalar_2"],
                ],
            })""",
        ),
    )
