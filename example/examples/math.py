from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import DenoModuleMat
from typegraph.materializers.worker import WorkerRuntime
from typegraph.types import typedefs as t

with TypeGraph(name="math") as g:
    worker = WorkerRuntime()

    allow_all = policies.allow_all()
    restrict_referer = t.func(
        t.struct(),
        t.boolean(),
        worker.module(
            """
        export default function(context: Record<string, string>) {
            console.log({ context })
            const url = new URL(context?.["referer"]);
            return url.pathname === "/math";
        }
        """
        ),
    )

    g.expose(
        fib=t.func(
            t.struct({"size": t.integer()}),
            t.list(t.float()),
            worker.module(
                """
                const CACHE = [1, 1];
                const MAX_CACHE_SIZE = 1000;
                export default function fib({ size }: { size: number }) {
                    if (size > MAX_CACHE_SIZE) {
                      throw new Error(`unsupported size ${size} > ${MAX_CACHE_SIZE}`);
                    }
                    let i = CACHE.length;
                    while (i++ < size) {
                      CACHE.push(CACHE[i-2] + CACHE[i-3]);
                    }
                    return CACHE.slice(0, size);
                }
                """
            ),
        ).add_policy(restrict_referer),
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
