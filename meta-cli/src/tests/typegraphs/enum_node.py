from typegraph import t, typegraph, Graph
from typegraph.runtimes import DenoRuntime


@typegraph()
def enum(g: Graph):
    deno = DenoRuntime()

    color = t.enum(["red", "green", "blue", "purple", "yellow"], name="Color")

    get_rgb = deno.import_(
        t.struct({"color": color}),
        t.struct({"rgb": t.list(t.integer(), name="RGB")}),
        module="ts/rgb.ts",
        name="get_rgb",
    )

    g.expose(rgb=get_rgb)
