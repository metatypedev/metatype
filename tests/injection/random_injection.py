# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import Graph, t, typegraph


@typegraph()
def random_injection(g: Graph):
    pub = Policy.public()
    deno = DenoRuntime()

    user = t.struct(
        {
            "id": t.uuid().from_random(),
            "ean": t.ean().from_random(),
            "name": t.string(config={"gen": "name"}).from_random(),
            "age": t.integer(config={"gen": "age", "type": "adult"}).from_random(),
            "married": t.boolean().from_random(),
            "birthday": t.datetime().from_random(),
            "friends": t.list(t.string(config={"gen": "first"})).from_random(),
            "phone": t.string(config={"gen": "phone"}).from_random(),
            "gender": t.string(config={"gen": "gender"}).from_random(),
            "firstname": t.string(config={"gen": "first"}).from_random(),
            "lastname": t.string(config={"gen": "last"}).from_random(),
            "occupation": t.string(config={"gen": "profession"}).from_random(),
            "street": t.string(config={"gen": "address"}).from_random(),
            "city": t.string(config={"gen": "city"}).from_random(),
            "postcode": t.string(config={"gen": "postcode"}).from_random(),
            "country": t.string(
                config={"gen": "country", "full": "true"}
            ).from_random(),
            "uri": t.uri().from_random(),
            "hostname": t.string(format="hostname").from_random(),
        }
    )

    user_out = t.struct(
        {
            "id": t.uuid(),
            "ean": t.ean(),
            "name": t.string(),
            "age": t.integer(),
            "married": t.boolean(),
            "birthday": t.datetime(),
            "friends": t.list(t.string()),
            "phone": t.string(),
            "gender": t.string(),
            "firstname": t.string(),
            "lastname": t.string(),
            "occupation": t.string(),
            "street": t.string(),
            "city": t.string(),
            "postcode": t.string(),
            "country": t.string(),
            "uri": t.uri(),
            "hostname": t.string(),
        }
    )

    # test int, str, float enum
    test_enum_str = t.struct(
        {
            "educationLevel": t.enum(
                ["primary", "secondary", "tertiary"]
            ).from_random(),
        }
    )
    test_enum_str_out = t.struct(
        {
            "educationLevel": t.string(),
        }
    )

    test_enum_int = t.struct(
        {
            "bits": t.integer(enum=[0, 1]).from_random(),
        }
    )
    test_enum_int_out = t.struct(
        {
            "bits": t.integer(),
        }
    )

    test_enum_float = t.struct(
        {
            "cents": t.float(enum=[0.25, 0.5, 1.0]).from_random(),
        }
    )
    test_enum_float_out = t.struct(
        {
            "cents": t.float(),
        }
    )

    # test either
    rubix_cube = t.struct({"name": t.string(), "size": t.integer()}, name="Rubix")
    toygun = t.struct({"color": t.string()}, name="Toygun")
    toy = t.either([rubix_cube, toygun], name="Toy")
    toy_struct = t.struct(
        {
            "toy": toy.from_random(),
        }
    )
    toy_struct_out = t.struct(
        {
            "toy": toy,
        }
    )

    # test union
    rgb = t.struct({"R": t.float(), "G": t.float(), "B": t.float()}, name="Rgb")
    vec = t.struct({"x": t.float(), "y": t.float(), "z": t.float()}, name="Vec")
    union_struct = t.struct(
        {
            "field": t.union([rgb, vec], name="UnionStruct").from_random(),
        }
    )
    union_struct_out = t.struct(
        {
            "field": t.union([rgb, vec]),
        }
    )

    random_list = t.struct(
        {
            "names": t.list(t.string(config={"gen": "name"})).from_random(),
        }
    )
    random_list_out = t.struct(
        {
            "names": t.list(t.string()),
        },
    )
    # Configure random injection seed value or the default will be used
    g.configure_random_injection(seed=1)
    g.expose(
        pub,
        randomUser=deno.func(user, user_out, code="(x) => x"),
        randomList=deno.func(random_list, random_list_out, code="(x) => x"),
        testEnumStr=deno.func(test_enum_str, test_enum_str_out, code="(x) => x"),
        testEnumInt=deno.func(test_enum_int, test_enum_int_out, code="(x) => x"),
        testEnumFloat=deno.func(test_enum_float, test_enum_float_out, code="(x) => x"),
        testEither=deno.func(toy_struct, toy_struct_out, code="(x) => x"),
        testUnion=deno.func(union_struct, union_struct_out, code="(x) => x"),
    )
