# skip:start
from typegraph import effects
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import PureFunMat
from typegraph.runtimes.http import HTTPRuntime
from typegraph.runtimes.http import RESTMat

http = HTTPRuntime("https://random.org/api")

with TypeGraph("functions") as g:
    # skip:end
    t.func(
        t.struct({"input": t.string()}),
        t.string(),
        PureFunMat("({ input }) => `hello ${input}`"),  # with logic
    )

    t.func(
        t.struct({}),
        t.enum(["head", "tail"]),
        RESTMat(http, "GET", "/flip_coin", effect=effects.none),  # where the logic is
    )
