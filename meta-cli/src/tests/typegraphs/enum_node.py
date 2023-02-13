from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("enum") as g:
    rgb_materializer = ModuleMat("ts/rgb.ts")

    color = t.enum(["red", "green", "blue", "purple", "yellow"]).named("Color")

    get_rgb = t.func(
        t.struct({"color": color}),
        t.struct({"rgb": t.array(t.integer()).named("RGB")}),
        rgb_materializer.imp("get_rgb"),
    )

    g.expose(rgb=get_rgb)
