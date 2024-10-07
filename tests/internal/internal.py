from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.python import PythonRuntime

from typegraph import t, typegraph


@typegraph()
def internal(g: Graph):
    public = Policy.public()
    internal = Policy.internal()

    deno = DenoRuntime()
    py = PythonRuntime()
    python = PythonRuntime()

    inp = t.struct({"first": t.float(), "second": t.float()})
    out = t.float()

    g.expose(
        sumDeno=deno.import_(inp, out, module="ts/logic.ts", name="sum").with_policy(
            internal
        ),
        remoteSumDeno=deno.import_(
            inp, out, module="ts/logic.ts", name="remoteSum"
        ).with_policy(public),
        sumPy=py.import_(inp, out, module="py/logic.py", name="sum").with_policy(
            internal
        ),
        remoteSumPy=python.import_(
            inp,
            out,
            module="py/logic.py",
            name="remote_sum",
        ).with_policy(public),
    )
