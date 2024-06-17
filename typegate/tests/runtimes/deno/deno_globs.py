from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def deno_globs(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        test_glob=deno.import_(
            t.struct({"a": t.float(), "b": t.float()}),
            t.float(),
            module="ts/dep/main.ts",
            deps=["ts/**/nested/*.ts"],
            name="doAddition",
        ),
    )
