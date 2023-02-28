from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union_attr") as g:
    rgb = t.struct({"R": t.float(), "G": t.float(), "B": t.float()}).named("rgb")
    vec = t.struct({"x": t.float(), "y": t.float(), "z": t.float()}).named("vec")
    pair_or_list = t.union(
        [t.struct({"first": t.float(), "second": t.float()}), t.array(t.float())]
    )
    axis_pairs = t.struct(
        {
            "xy": pair_or_list.named("xy"),
            "xz": pair_or_list.named("xz"),
            "yz": pair_or_list.named("yz"),
        }
    ).named("AxisPair")
    public = policies.public()
    normalize = t.func(
        t.struct(
            {"x": t.float(), "y": t.float(), "z": t.float(), "as": t.string()}
        ).named("Input"),
        t.union([rgb, vec, axis_pairs]).named("Output"),
        ModuleMat("ts/union/vec_normalizer.ts").imp("normalize"),
    ).add_policy(public)
    g.expose(normalize=normalize)
