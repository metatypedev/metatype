from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph()
def union_attr(g: Graph):
    rgb = t.struct({"R": t.float(), "G": t.float(), "B": t.float()}, name="Rgb")
    vec = t.struct({"x": t.float(), "y": t.float(), "z": t.float()}, name="Vec")
    pair = t.struct({"first": t.float(), "second": t.float()})
    axis_pairs = t.struct(
        {
            "xy": pair.rename("xy"),
            "xz": pair.rename("xz"),
            "yz": pair.rename("yz"),
        },
        name="AxisPair",
    )
    public = Policy.public()
    deno = DenoRuntime()
    normalize = deno.import_(
        t.struct(
            {"x": t.float(), "y": t.float(), "z": t.float(), "as": t.string()},
            name="Input",
        ),
        t.union([rgb, vec, axis_pairs], name="Output"),
        module="ts/union/vec_normalizer.ts",
        name="normalize",
    ).with_policy(public)
    g.expose(normalize=normalize)
