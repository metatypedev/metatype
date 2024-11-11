# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.python import PythonRuntime
from typegraph.runtimes.wasm import WasmRuntime


@typegraph()
def identities(g: Graph):
    # TODO: injections
    # TODO: materializers (HttpRuntime.rest)

    primitives = t.struct(
        {
            "str": t.string(),
            "enum": t.enum(["wan", "tew", "tree"]),
            "uuid": t.uuid(as_id=True),
            "email": t.email(),
            "ean": t.ean(),
            "json": t.json(),
            "uri": t.uri(),
            "date": t.date(),
            "datetime": t.datetime(),
            "int": t.integer(),
            "float": t.float(),
            "boolean": t.boolean(),
            # TODO: file upload support for fdk?
            # "file": t.file(),
        },
    ).rename("primitives")
    composites = t.struct(
        {
            "opt": t.optional(t.string()),
            "either": t.either(
                [
                    primitives,
                    t.struct({"branch2": t.string()}).rename("branch2"),
                ],
            ),
            "union": t.union(
                [
                    t.list(t.enum(["grey", "beige"])).rename("branch4"),
                    t.integer(),
                    t.string(),
                    t.email().rename("branch4again"),
                ],
            ),
            "list": t.list(t.string()),
        },
    ).rename("composites")
    cycles1 = t.struct(
        {
            # phantom field allows us to get past gql empty object query issues
            # numbering the phantom fields prevents type ambigiuty during union validation
            "phantom1": t.string().optional(),
            "to2": g.ref("cycles2").optional(),
            "list3": t.list(g.ref("cycles3")).optional(),
        },
    ).rename("cycles1")

    t.either(
        [
            g.ref("cycles3"),
            g.ref("cycles1"),
        ],
    ).rename("cycles2")

    t.union(
        [
            t.struct(
                {
                    "phantom3a": t.string().optional(),
                    "to1": g.ref("cycles1").optional(),
                },
            ).rename("branch33A"),
            t.struct(
                {
                    "phantom3b": t.string().optional(),
                    "to2": g.ref("cycles2").optional(),
                },
            ).rename("branch33B"),
        ],
    ).rename("cycles3")

    simple_cycles_1 = t.struct(
        {
            "phantom1": t.string().optional(),
            "to2": g.ref("simple_cycles_2").optional(),
        },
    ).rename("simple_cycles_1")

    t.struct(
        {
            "phantom2": t.string().optional(),
            "to3": g.ref("simple_cycles_3").optional(),
        },
    ).rename("simple_cycles_2")

    t.struct(
        {
            "phantom3": t.string().optional(),
            "to1": g.ref("simple_cycles_1").optional(),
        },
    ).rename("simple_cycles_3")

    python = PythonRuntime()
    wasm = WasmRuntime.wire("./identities/rust.wasm")
    deno = DenoRuntime()

    # we wrap the types in a struct to make the
    # graphql queries easier
    # we also name them to make them stable across changes
    # to the graph
    def argify(ty):
        return t.struct({"data": ty}).rename(f"{ty.name}_args")

    primitives_args = argify(primitives)
    composites_args = argify(composites)
    cycles1_args = argify(cycles1)
    simple_cycles_1_args = argify(simple_cycles_1)
    g.expose(
        Policy.public(),
        py_primitives=python.import_(
            primitives_args,
            primitives,
            module="./identities/py/handlers.py",
            deps=["./identities/py/handlers_types.py"],
            name="primitives",
        ).rename("py_primitives"),
        py_composites=python.import_(
            composites_args,
            composites,
            module="./identities/py/handlers.py",
            deps=["./identities/py/handlers_types.py"],
            name="composites",
        ).rename("py_composites"),
        py_cycles=python.import_(
            cycles1_args,
            cycles1,
            module="./identities/py/handlers.py",
            deps=["./identities/py/handlers_types.py"],
            name="cycles",
        ).rename("py_cycles"),
        py_simple_cycles=python.import_(
            simple_cycles_1_args,
            simple_cycles_1,
            module="./identities/py/handlers.py",
            deps=["./identities/py/handlers_types.py"],
            name="simple_cycles",
        ).rename("py_simple_cycles"),
        ts_primitives=deno.import_(
            primitives_args,
            primitives,
            module="./identities/ts/handlers.ts",
            deps=["./identities/ts/fdk.ts"],
            name="primitives",
        ).rename("ts_primitives"),
        ts_composites=deno.import_(
            composites_args,
            composites,
            module="./identities/ts/handlers.ts",
            deps=["./identities/ts/fdk.ts"],
            name="composites",
        ).rename("ts_composites"),
        ts_cycles=deno.import_(
            cycles1_args,
            cycles1,
            module="./identities/ts/handlers.ts",
            deps=["./identities/ts/fdk.ts"],
            name="cycles",
        ).rename("ts_cycles"),
        ts_simple_cycles=deno.import_(
            simple_cycles_1_args,
            simple_cycles_1,
            module="./identities/ts/handlers.ts",
            deps=["./identities/ts/fdk.ts"],
            name="simple_cycles",
        ).rename("ts_simple_cycles"),
        rs_primitives=wasm.handler(
            primitives_args,
            primitives,
            name="primitives",
        ).rename("rs_primitives"),
        rs_composites=wasm.handler(
            composites_args,
            composites,
            name="composites",
        ).rename("rs_composites"),
        rs_cycles=wasm.handler(
            cycles1_args,
            cycles1,
            name="cycles",
        ).rename("rs_cycles"),
        rs_simple_cycles=wasm.handler(
            simple_cycles_1_args,
            simple_cycles_1,
            name="simple_cycles",
        ).rename("rs_simple_cycles"),
    )
