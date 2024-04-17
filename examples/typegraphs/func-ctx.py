# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors, Rate

from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    name="func-ctx",
    rate=Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=Cors(allow_origin=["https:#metatype.dev", "http://localhost:3000"]),
)
def func_ctx(g: Graph):
    deno = DenoRuntime()

    # skip:end
    g.expose(
        Policy.public(),
        ctx=deno.func(
            t.struct({}),
            t.struct(
                {
                    # the effect under which the function was run
                    "effect": t.enum(["create", "read", "update", "delete"]),
                    "meta": t.struct(
                        {
                            # url to host typegraph
                            # can be used to talk to host typegraph from within
                            # function
                            "url": t.string(),
                            # token for accessing host typegraph
                            "token": t.string(),
                        }
                    ),
                    # http headers
                    "headers": t.list(t.list(t.string())),
                    # typegraph secrets
                    "secrets": t.list(t.list(t.string())),
                    # FIXME: explanation
                    "parent": t.string(),
                    "context": t.string(),
                }
            ),
            code="""(_: any, ctx: any) => ({
            ...ctx,
            parent: JSON.stringify(ctx.context),
            context: JSON.stringify(ctx.context),

            // modeling arbitrary associative arrays in
            // graphql is difficult so we return a listified format.
            // Follow the link for alternative solutions
            // https://github.com/graphql/graphql-spec/issues/101#issuecomment-170170967
            headers: Object.entries(ctx.headers),
            secrets: Object.entries(ctx.secrets),
          })""",
        ),
    )
