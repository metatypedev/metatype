from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import DenoModuleMat
from typegraph.types import typedefs as t

with TypeGraph(name="math") as g:
    allow_all = policies.allow_all()

    # restrict_referer = t.func(t.struct(), t.boolean(), DenoModuleMat(
    #     """
    #     export default function(_: any, context) {
    #         const url = new URL(context["referer]);
    #         return url.pathname === "/math";
    #     }
    #     """
    # ))

    g.expose(
        random=t.func(
            t.struct(),
            t.float(),
            DenoModuleMat(
                """
                export default function() {
                    return Math.random();
                }
                """
            ),
        ).add_policy(allow_all),
        randomItem=t.func(
            t.struct({"items": t.list(t.string())}),
            t.string(),
            DenoModuleMat(
                """
                export default function({ items }: { items: string[] }) {
                    return items[Math.floor(Math.random() * items.length)]
                }
                """
            ),
        ).add_policy(allow_all),
        randomIntInRange=t.func(
            t.struct({"from": t.integer(), "to": t.integer()}),
            t.integer(),
            DenoModuleMat(
                """
                export default function(
                    { from, to }: { from: number, to: number },
                    context: Record<string, string>,
                ) {
                    const extent = to - from;
                    if (extent <= 0) throw new Error("invalid range");
                    return from + Math.floor(Math.random() * extent);
                }
                """
            ),
        ).add_policy(allow_all),
    )
