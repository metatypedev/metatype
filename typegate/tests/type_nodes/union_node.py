from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union") as g:
    channel_of_8_bits = t.integer().min(0).max(255).named("8BitsChannel")

    rgb_array = t.array(channel_of_8_bits).min(3).max(3).named("RGB_array")
    rgb_struct = t.struct(
        {
            "r": channel_of_8_bits,
            "g": channel_of_8_bits,
            "b": channel_of_8_bits,
        }
    ).named("RGB_struct")

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

    color = t.union([rgb_array, rgb_struct, hex, colorName]).named("Color")

    colorFormat = t.string().enum(["rgb_array", "rgb_struct", "hex", "colorName"])

    colorMaterializer = ModuleMat("ts/union/color_converter.ts")

    convert = t.func(
        t.struct({"color": color, "to": colorFormat}),
        color,
        colorMaterializer.imp("convert"),
    )

    public = policies.public()

    g.expose(
        convert=convert.add_policy(public),
    )
