# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def deno(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    fib = deno.func(
        t.struct({"n": t.float()}),
        t.struct({"res": t.integer(), "ms": t.float()}),
        code="""
        ({ n }) => {
                let a = 0, b = 1, c;
                const start = performance.now();
                for (
                    let i = 0;
                    i < Math.min(n, 10);
                    c = a + b, a = b, b = c, i += 1
                );
                return {
                    res: b,
                    ms: performance.now() - start,
                };
            }
            """,
    )

    g.expose(
        public,
        compute_fib=fib,
    )
