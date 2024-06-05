# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors, Rate

# skip:end
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    # skip:start
    rate=Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def math(g: Graph):
    public = Policy.public()

    # we need a runtime to run the functions on
    deno = DenoRuntime()

    # we can provide the function code inline
    random_item_fn = "({ items }) => items[Math.floor(Math.random() * items.length)]"

    # or we can point to a local file that's accessible to the meta-cli
    fib_module = "scripts/fib.ts"

    # the policy implementation is based on functions as well
    restrict_referer = deno.policy(
        "restrict_referer_policy",
        '(_, context) => context.headers.referer && ["localhost", "metatype.dev"].includes(new URL(context.headers.referer).hostname)',
    )

    g.expose(
        public,
        # all materializers have inputs and outputs
        fib=deno.import_(
            t.struct({"size": t.integer()}),
            t.list(t.float()),
            module=fib_module,
            name="default",  # name the exported function to run
        ).with_policy(restrict_referer),
        randomItem=deno.func(
            t.struct({"items": t.list(t.string())}),
            t.string(),
            code=random_item_fn,
        ),
        random=deno.func(
            t.struct(),
            t.float(),
            code="() => Math.random()",  # more inline code
        ),
    )
