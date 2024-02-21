from typegraph import typegraph, t, Graph, Policy
from typegraph.runtimes import DenoRuntime


@typegraph()
def apply_nested_context(g: Graph):
    deno = DenoRuntime()
    has_profile = Policy.context("profile")

    g.expose(
        has_profile,
        simple=deno.identity(t.struct({"id": t.integer()})).apply(
            {"id": g.from_context("profile.id")}
        ),
        customKey=deno.identity(t.struct({"custom": t.string()})).apply(
            {"custom": g.from_context('.profile["custom key"]')}
        ),
        thirdProfileData=deno.identity(t.struct({"third": t.string()})).apply(
            {"third": g.from_context("profile.data[2]")}
        ),
        deeplyNestedEntry=deno.identity(t.struct({"value": t.string()})).apply(
            {"value": g.from_context('profile.deeply[0]["nested"][1].value')}
        ),
    )
