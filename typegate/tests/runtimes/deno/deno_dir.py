from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def deno_dir(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        test_dir=deno.import_(
            t.struct({"a": t.float(), "b": t.float()}),
            t.float(),
            module="ts/dep/main.ts",
            deps=["ts/dep"],
            name="doAddition",
        ),
    )
