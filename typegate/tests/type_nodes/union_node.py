from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat, PureFunMat

with TypeGraph("union") as g:
    channel_of_8_bits = t.integer().min(0).max(255).named("8BitsChannel")

    rgb_array = t.struct({"rgb": t.array(channel_of_8_bits).min(3).max(3)}).named(
        "RGBArray"
    )

    rgb_struct = t.struct(
        {
            "r": channel_of_8_bits,
            "g": channel_of_8_bits,
            "b": channel_of_8_bits,
        }
    ).named("RGBStruct")

    hex = t.struct(
        {"hex": t.string().pattern("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")}
    ).named("HexColor")

    named_color = t.struct(
        {
            "name": t.string().enum(
                [
                    "red",
                    "green",
                    "blue",
                    "black",
                    "white",
                ]
            )
        }
    ).named("NamedColor")

    color = t.union([rgb_array, rgb_struct, hex, named_color]).named("Color")

    colorFormat = t.string().enum(["rgb_array", "rgb_struct", "hex", "colorName"])

    colorMaterializer = ModuleMat("ts/union/color_converter.ts")

    convert = t.func(
        t.struct({"color": color, "to": colorFormat}),
        color,
        colorMaterializer.imp("convert"),
    )

    nested_unions = t.union(
        [
            t.struct(
                {
                    "a": t.union(
                        [
                            t.struct(
                                {
                                    "a": t.union(
                                        [
                                            t.struct({"s": t.string()}).named("A3"),
                                            t.struct(
                                                {"i": t.integer(), "j": t.integer()}
                                            ).named("A4"),
                                        ]
                                    )
                                }
                            ).named("A2"),
                            g("B"),
                        ],
                    ),
                }
            ).named("A1"),
            t.struct(
                {
                    "b": t.string(),
                }
            ).named("B"),
        ]
    ).named("NestedUnions")

    multilevel_union = t.union(
        [
            t.struct({"a": t.string()}).named("Ua"),
            t.struct({"b": t.string()}).named("Ub"),
            t.union(
                [
                    t.struct({"c": t.string()}).named("Uc"),
                    t.struct({"d": t.string()}).named("Ud"),
                    t.either(
                        [
                            t.struct({"e": t.string()}).named("Ue"),
                            t.struct({"f": t.string()}).named("Uf"),
                        ]
                    ),
                ]
            ),
        ]
    ).named("MultilevelUnion")

    scalar_union = t.union([t.boolean(), t.integer(), t.string()]).named("ScalarUnion")

    public = policies.public()

    g.expose(
        convert=convert,
        nested=t.func(
            t.struct({"inp": t.array(nested_unions)}),
            t.array(nested_unions),
            PureFunMat("({ inp }) => inp"),
        ),
        scalar=t.func(
            t.struct({"inp": t.array(scalar_union)}),
            t.array(scalar_union),
            PureFunMat("({ inp }) => inp"),
        ),
        multilevel=t.func(
            t.struct({"inp": t.array(multilevel_union)}),
            t.array(multilevel_union),
            PureFunMat("({ inp }) => inp"),
        ),
        default_policy=public,
    )
