# skip:start
from typegraph import TypeGraph, fx, t
from typegraph.runtimes.deno import PureFunMat
from typegraph.runtimes.http import HTTPRuntime, RESTMat

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
        RESTMat(http, "GET", "/flip_coin", effect=fx.read()),  # where the logic is
    )
