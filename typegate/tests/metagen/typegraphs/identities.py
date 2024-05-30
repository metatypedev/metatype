from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.python import PythonRuntime
from typegraph.runtimes.wasm import WasmRuntime
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def metagen_identities(g: Graph):
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
            "int": t.integer(),
            "float": t.float(),
            "boolean": t.boolean(),
            "file": t.file(),
        }
    ).rename("primitives")
    composites = t.struct(
        {
            "opt": t.optional(t.string()),
            "either": t.either(
                [
                    primitives,
                    t.struct({"branch2": t.string()}),
                    t.string(),
                    t.file().rename("branch4"),
                ]
            ),
            "union": t.union(
                [
                    primitives,
                    t.struct({"branch2": t.string()}),
                    t.string(),
                    t.file().rename("branch4"),
                ]
            ),
            "list": t.list(t.string()),
            "type": t.string(),
        }
    ).rename("composites")
    cycles1 = t.struct(
        {"to2": g.ref("cycles2"), "list3": t.list(g.ref("cycles3"))}
    ).rename("cycles1")

    t.either(
        [
            g.ref("cycles3"),
            g.ref("cycles1").optional(),
        ]
    ).rename("cycles2")

    t.union(
        [t.struct({"to1": g.ref("cycles1")}), t.struct({"to2": g.ref("cycles2")})]
    ).rename("cycles3")

    python = PythonRuntime()
    wasm = WasmRuntime.wire("rust.wasm")
    deno = DenoRuntime()

    g.expose(
        Policy.public(),
        py_primitives=python.import_(
            primitives,
            primitives,
            module="./scripts/py/handlers.py",
            name="primtives",
        ).rename("py_primitives"),
        py_composites=python.import_(
            composites,
            composites,
            module="./scripts/py/handlers.py",
            name="composites",
        ).rename("py_composites"),
        py_cycles=python.import_(
            cycles1,
            cycles1,
            module="./scripts/py/handlers.py",
            name="cycles",
        ).rename("py_cycles"),
        ts_primitives=deno.import_(
            primitives,
            primitives,
            module="./scripts/ts/handlers.ts",
            name="primtives",
        ).rename("ts_primitives"),
        ts_composites=deno.import_(
            composites,
            composites,
            module="./scripts/ts/handlers.ts",
            name="composites",
        ).rename("ts_composites"),
        ts_cycles=deno.import_(
            cycles1,
            cycles1,
            module="./scripts/ts/handlers.ts",
            name="cycles",
        ).rename("ts_cycles"),
        rs_primitives=wasm.handler(
            primitives,
            primitives,
            name="primtives",
        ).rename("ts_primitives"),
        rs_composites=wasm.handler(
            composites,
            composites,
            name="composites",
        ).rename("ts_composites"),
        rs_cycles=wasm.handler(
            cycles1,
            cycles1,
            name="cycles",
        ).rename("ts_cycles"),
    )
