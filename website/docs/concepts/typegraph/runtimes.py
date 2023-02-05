# skip:start
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("runtimes") as g:
    # skip:end
    http = HTTPRuntime("https://random.org/api")

    # same func as above
    t.func(
        t.struct({}),
        t.enum(["head", "tail"]),
        http.get("/flip_coin"),  # implicitly attaches runtime to all types
    )
