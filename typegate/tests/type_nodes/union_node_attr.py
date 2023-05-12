from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union_attr") as g:
    rgb = t.struct({"R": t.float(), "G": t.float(), "B": t.float()}).named("Rgb")
    vec = t.struct({"x": t.float(), "y": t.float(), "z": t.float()}).named("Vec")
    pair = t.struct({"first": t.float(), "second": t.float()})
    axis_pairs = t.struct(
        {
            "xy": pair.named("xy"),
            "xz": pair.named("xz"),
            "yz": pair.named("yz"),
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
