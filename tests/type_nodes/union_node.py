# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def union_node(g: Graph):
    channel_of_8_bits = t.integer(min=0, max=255, name="8BitChannel")

    rgb_array = t.list(channel_of_8_bits, min=3, max=3, name="RGBArray")

    rgb_struct = t.struct(
        {
            "r": channel_of_8_bits,
            "g": channel_of_8_bits,
            "b": channel_of_8_bits,
        },
        name="RGBStruct",
    )

    hex = t.string(pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", name="HexColor")

    named_color = t.enum(
        [
            "red",
            "green",
            "blue",
            "black",
            "white",
        ],
        name="NamedColor",
    )

    color = t.union([rgb_array, rgb_struct, hex, named_color], name="Color")

    colorFormat = t.enum(["rgb_array", "rgb_struct", "hex", "colorName"])

    deno = DenoRuntime()
    convert = deno.import_(
        t.struct({"color": color, "to": colorFormat}),
        color,
        module="ts/union/color_converter.ts",
        name="convert",
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
                                            t.struct({"s": t.string()}, name="A3"),
                                            t.struct(
                                                {"i": t.integer(), "j": t.integer()},
                                                name="A4",
                                            ),
                                        ]
                                    )
                                },
                                name="A2",
                            ),
                            g.ref("B"),
                        ],
                    ),
                },
                name="A1",
            ),
            t.struct(
                {
                    "b": t.string(),
                },
                name="B",
            ),
        ],
        name="NestedUnions",
    )

    multilevel_union = t.union(
        [
            t.struct({"a": t.string()}, name="Ua"),
            t.struct({"b": t.string()}, name="Ub"),
            t.union(
                [
                    t.struct({"c": t.string()}, name="Uc"),
                    t.struct({"d": t.string()}, name="Ud"),
                    t.either(
                        [
                            t.struct({"e": t.string()}, name="Ue"),
                            t.struct({"f": t.string()}, name="Uf"),
                        ]
                    ),
                ]
            ),
        ],
        name="MultilevelUnion",
    )

    scalar_union = t.union([t.boolean(), t.integer(), t.string()], name="ScalarUnion")

    public = Policy.public()

    g.expose(
        public,
        convert=convert,
        nested=deno.func(
            t.struct({"inp": t.list(nested_unions)}),
            t.list(nested_unions),
            code="({ inp }) => inp",
        ),
        scalar=deno.func(
            t.struct({"inp": t.list(scalar_union)}),
            t.list(scalar_union),
            code="({ inp }) => inp",
        ),
        multilevel=deno.func(
            t.struct({"inp": t.list(multilevel_union)}),
            t.list(multilevel_union),
            code="({ inp }) => inp",
        ),
    )
