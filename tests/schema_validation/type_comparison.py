# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes import DenoRuntime


@typegraph()
def type_comparison(g: Graph):
    deno = DenoRuntime()
    cases = {}

    def case(name: str, subtype: t.typedef, supertype: t.typedef):
        name = name + "_test_type"
        cases[name] = deno.identity(
            t.struct(
                {
                    "parent_field": subtype,
                },
            ),
        ).extend(
            {
                "injected": deno.identity(t.struct({"field": supertype})).reduce(
                    {"field": g.inherit().from_parent("parent_field")},
                ),
            },
        )

    case("boolean_ok_1", t.boolean(), t.boolean())

    case("integer_ok_1", t.integer(), t.integer())
    case("integer_ok_2", t.integer(min=12), t.integer())
    case("integer_ok_3", t.integer(min=12), t.integer(min=6))
    case("integer_ok_4", t.integer(max=12), t.integer())
    case("integer_ok_5", t.integer(max=12), t.integer(max=13))
    case("integer_ok_6", t.integer(min=12, max=13), t.integer(min=6, max=14))
    case("integer_ok_7", t.integer(multiple_of=12), t.integer())
    case("integer_ok_8", t.integer(multiple_of=12), t.integer(multiple_of=6))
    case("integer_fail_1", t.integer(), t.integer(min=12))
    case("integer_fail_2", t.integer(min=12), t.integer(min=13))
    case("integer_fail_3", t.integer(max=12), t.integer(max=11))
    case("integer_fail_4", t.integer(min=9, max=13), t.integer(min=10, max=12))
    case("integer_fail_5", t.integer(multiple_of=12), t.integer(multiple_of=8))
    case("integer_fail_6", t.integer(multiple_of=6), t.integer(multiple_of=12))

    case("float_ok_1", t.float(), t.float())
    case("float_ok_2", t.float(min=12), t.float())
    case("float_ok_3", t.float(min=12), t.float(min=6))
    case("float_ok_4", t.float(max=12), t.float())
    case("float_ok_5", t.float(max=12), t.float(max=13))
    case("float_ok_6", t.float(min=12, max=13), t.float(min=6, max=14))
    case("float_ok_7", t.float(multiple_of=12), t.float())
    case("float_ok_8", t.float(multiple_of=12.2), t.float(multiple_of=6.1))
    case("float_fail_1", t.float(), t.float(min=12))
    case("float_fail_2", t.float(min=12), t.float(min=13))
    case("float_fail_3", t.float(max=12), t.float(max=11))
    case("float_fail_4", t.float(min=9, max=13), t.float(min=6, max=12))
    case("float_fail_5", t.float(multiple_of=12), t.float(multiple_of=5.999))
    case("float_fail_6", t.float(multiple_of=6), t.float(multiple_of=12))

    case("number_ok_1", t.integer(), t.float())
    case("number_ok_2", t.integer(min=12), t.float())
    case("number_ok_3", t.integer(min=12), t.float(min=6.8))
    case("number_ok_4", t.integer(max=12), t.float(max=12))
    case("number_ok_5", t.integer(multiple_of=12), t.float(multiple_of=12))
    case("number_fail_1", t.float(), t.integer())
    case("number_fail_2", t.integer(min=12), t.float(min=12.1))
    case("number_fail_3", t.integer(multiple_of=12), t.float(multiple_of=12.1))

    case("string_ok_1", t.string(), t.string())
    case("string_ok_2", t.string(min=12), t.string())
    case("string_ok_3", t.string(min=12), t.string(min=6))
    case("string_ok_4", t.string(max=12), t.string())
    case("string_ok_5", t.string(max=12), t.string(max=13))
    case("string_ok_6", t.string(min=12, max=13), t.string(min=6, max=14))
    case("string_fail_1", t.string(), t.string(min=12))
    case("string_fail_2", t.string(min=12), t.string(min=13))

    case("file_ok_1", t.file(), t.file())
    case("file_ok_2", t.file(min=12), t.file())
    case("file_ok_3", t.file(min=12), t.file(min=6))
    case("file_ok_4", t.file(max=12), t.file())
    case("file_ok_5", t.file(max=12), t.file(max=13))
    case("file_ok_6", t.file(min=12, max=13), t.file(min=6, max=14))
    case("file_ok_7", t.file(allow=["image/png"]), t.file())
    case(
        "file_ok_8",
        t.file(allow=["image/png"]),
        t.file(allow=["image/png", "image/jpeg"]),
    )
    case(
        "file_ok_9",
        t.file(allow=["image/png", "image/jpeg"]),
        t.file(allow=["image/png", "image/jpeg"]),
    )
    # TODO support for wildcards
    # case("file_ok_10", t.file(allow="image/*"), t.file())
    # FIXME no failure here!!!!
    case("file_fail_1", t.file(), t.file(min=12))
    case("file_fail_2", t.file(min=12), t.file(min=13))
    case("file_fail_3", t.file(), t.file(allow=["image/png"]))
    case("file_fail_4", t.file(allow=["image/png"]), t.file(allow=["image/jpeg"]))
    case(
        "file_fail_5",
        t.file(allow=["image/png", "image/jpeg"]),
        t.file(allow=["image/png"]),
    )

    case("optional_ok_1", t.optional(t.integer()), t.optional(t.integer()))
    case("optional_ok_2", t.optional(t.integer(min=12)), t.optional(t.integer()))
    case("optional_ok_3", t.optional(t.integer()), t.optional(t.float()))
    case("optional_ok_1_1", t.integer(), t.optional(t.integer()))
    case("optional_ok_1_2", t.integer(min=12), t.optional(t.integer()))
    case("optional_ok_1_3", t.integer(), t.optional(t.float()))
    case("optional_fail_1", t.optional(t.integer()), t.integer())
    case("optional_fail_2", t.optional(t.integer()), t.optional(t.integer(min=12)))

    case("list_ok_1", t.list(t.integer()), t.list(t.integer()))
    case("list_ok_2", t.list(t.integer(min=12)), t.list(t.integer()))
    case("list_ok_3", t.list(t.integer()), t.list(t.float()))
    case("list_fail_1", t.list(t.integer()), t.integer())
    case("list_fail_2", t.list(t.integer()), t.list(t.integer(min=12)))
    case("list_fail_3", t.list(t.integer()), t.list(t.float(min=12)))

    case(
        "struct_ok_1",
        t.struct({"field": t.integer()}),
        t.struct({"field": t.integer()}),
    )
    case(
        "struct_ok_2",
        t.struct({"field": t.integer(min=12)}),
        t.struct({"field": t.integer()}),
    )
    case(
        "struct_ok_3",
        t.struct({"field": t.integer()}),
        t.struct({"field": t.float()}),
    )
    case(
        "struct_ok_4",
        t.struct({"field1": t.integer()}),
        t.struct({"field1": t.integer(), "field2": t.integer().optional()}),
    )
    case(
        "struct_fail_1",
        t.struct({"field": t.integer()}),
        t.struct({"field": t.integer(min=12)}),
    )
    case(
        "struct_fail_2",
        t.struct({"field": t.integer()}),
        t.struct({"field1": t.integer()}),
    )
    case(
        "struct_fail_3",
        t.struct({"field": t.integer()}),
        t.struct({"field": t.integer(), "field2": t.integer()}),
    )

    case("union_ok_1", t.union([t.integer()]), t.union([t.integer(), t.float()]))
    case("union_ok_2", t.union([t.integer(min=12)]), t.union([t.integer(), t.float()]))
    case(
        "union_ok_3",
        t.union([t.boolean(), t.integer()]),
        t.union([t.integer(), t.boolean()]),
    )
    case(
        "union_ok_4",
        t.either([t.boolean(), t.integer()]),
        t.union([t.integer(), t.boolean()]),
    )
    case(
        "union_ok_5",
        t.union([t.boolean(), t.integer()]),
        t.either([t.integer(), t.boolean()]),
    )
    case("union_ok_6", t.union([t.integer()]), t.integer())
    case("union_ok_7", t.union([t.integer()]), t.float())
    case("union_ok_8", t.integer(), t.union([t.integer(), t.string()]))
    case("union_fail_1", t.union([t.integer(), t.float()]), t.union([t.integer()]))
    case(
        "union_fail_2",
        t.union([t.integer(), t.float()]),
        t.either([t.integer(), t.float()]),
    )
    case("union_fail_3", t.float(), t.either([t.integer(), t.string()]))
    case("union_fail_4", t.integer(), t.union([t.integer(min=12), t.string()]))

    case("enum_ok_1", t.enum(["a", "b", "c"]), t.enum(["a", "b", "c"]))
    case("enum_ok_2", t.enum(["a", "b"]), t.enum(["a", "b", "c"]))
    case("enum_ok_3", t.integer(enum=[1, 2, 3]), t.float(enum=[1.0, 2.0, 3.0]))
    # TODO make this valid
    # case("enum_ok_4", t.float().enum([1.0, 2.0]), t.integer().enum([1, 2]))
    case("enum_fail_1", t.enum(["a", "b", "c"]), t.enum(["a", "b"]))
    case("enum_fail_2", t.string(), t.enum(["a", "b"]))

    g.expose(Policy.public(), **cases)
