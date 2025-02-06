# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime, DenoModule

# skip:end


@typegraph()
def deno_import(g: Graph):
    public = Policy.public()
    deno = DenoRuntime()

    g.expose(
        public,
        add=deno.import_(
            t.struct({"a": t.integer(), "b": t.integer()}),
            t.integer(),
            module="./scripts/ops.ts",  # path to ts file
            name="doAddition",  # function export from ts file to use
            # deps=[], path to dependencies
        ),
    )

    # We can also use the following method for reusability
    module = DenoModule(
        path="./scripts/ops.ts",
        deps=["./scripts/deps.ts"],
    )

    g.expose(
        public,
        add_alt=deno.import_(
            t.struct({"a": t.integer(), "b": t.integer()}),
            t.integer(),
            module=module.import_("doAddition"),  # name of the function to use
        ),
    )
