from typegraph_next import t, typegraph, Graph
from typegraph_next.runtimes import DenoRuntime


@typegraph()
def union(g: Graph):
    rgb = t.array(t.integer(min=0, max=255), min=3, max=3, name="RGBArray")
    hex = t.string(pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", name="HexColor")
    colorName = t.enum(
        [
            "red",
            "black",
            "blue",
            "orange",
            "purple",
            "white",
            "yellow",
        ],
        name="NamedColor",
    )

    color = t.union((rgb, hex, colorName), name="Color")

    colorFormat = t.enum(["rgb", "hex", "colorName"])

    deno = DenoRuntime()
    convert = deno.import_(
        t.struct({"color": color, "to": colorFormat}),
        color,
        module="ts/color_converter.ts",
        name="convert",
    )

    g.expose(convert=convert)
