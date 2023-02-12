# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import PureFunMat

# skip:end

with TypeGraph(
    "deno",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()

    fib = t.func(
        t.struct({"n": t.number()}),
        t.struct({"res": t.integer(), "ms": t.float()}),
        PureFunMat(
            """
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
            """
        ),
    )

    g.expose(
        compute_fib=fib,
        default_policy=[public],
    )
