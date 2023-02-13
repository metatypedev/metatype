from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union") as g:
    rgb = t.array(t.integer().min(0).max(255)).min(3).max(3).named("RGB")
    hex = t.string().pattern("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$").named("HEX")
    colorName = (
        t.string()
        .enum(
            [
                "red",
                "green",
                "blue",
                "black",
                "white",
            ]
        )
        .named("ColorName")
    )

    color = t.union((rgb, hex, colorName)).named("Color")

    colorFormat = t.string().enum(["rgb", "hex", "colorName"])

    colorMaterializer = ModuleMat("ts/union/color_converter.ts")

    convert = t.func(
        t.struct({"color": color, "to": colorFormat}),
        color,
        colorMaterializer.imp("convert"),
    )

    public = policies.public()

    g.expose(convert=convert.add_policy(public))
